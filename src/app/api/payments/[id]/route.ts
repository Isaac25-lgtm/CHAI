import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, hasPermission, isFinance, isAdmin, canAccessDistrict } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import type { AuditAction, PaymentStatus } from '@/generated/prisma/enums';

// ---------------------------------------------------------------------------
// Valid status transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['VERIFIED'],
  VERIFIED: ['APPROVED'],
  APPROVED: ['PAID'],
  PAID: ['RECONCILED'],
};

// Any non-RECONCILED status can be rejected (reverted to DRAFT with reason)
const REJECTABLE_STATUSES = ['SUBMITTED', 'VERIFIED', 'APPROVED', 'PAID'];

// ---------------------------------------------------------------------------
// GET /api/payments/[id] — single payment with names entry info
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.PAYMENTS_LIST);

    const { id } = await params;

    const payment = await db.paymentRecord.findUnique({
      where: { id },
      include: {
        namesEntry: {
          include: {
            visit: {
              select: {
                id: true,
                visitNumber: true,
                visitDate: true,
                facility: {
                  select: {
                    name: true,
                    districtId: true,
                    district: { select: { name: true } },
                  },
                },
              },
            },
            createdBy: { select: { id: true, name: true } },
          },
        },
        approvedBy: { select: { id: true, name: true, email: true } },
        paidBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Scope check: ensure user can access this district's data
    const districtId = payment.namesEntry?.visit?.facility?.districtId;
    if (districtId && !canAccessDistrict(user, districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/payments/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/payments/[id] — update payment / transition status
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await db.paymentRecord.findUnique({
      where: { id },
      include: {
        namesEntry: {
          select: {
            fullName: true,
            visitId: true,
            visit: { select: { facility: { select: { districtId: true } } } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Scope check
    const districtId = existing.namesEntry?.visit?.facility?.districtId;
    if (districtId && !canAccessDistrict(user, districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    let auditAction: AuditAction = 'UPDATE';

    // Handle rejection (special path — reverts to DRAFT with reason)
    if (body.reject === true || body.rejectionReason) {
      if (!isFinance(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Only finance officers or admins can reject payments' },
          { status: 403 },
        );
      }
      if (!REJECTABLE_STATUSES.includes(existing.status)) {
        return NextResponse.json(
          { error: `Cannot reject a payment in ${existing.status} status` },
          { status: 400 },
        );
      }
      if (!body.rejectionReason || typeof body.rejectionReason !== 'string' || body.rejectionReason.trim().length === 0) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 },
        );
      }
      updateData.status = 'DRAFT';
      updateData.rejectionReason = body.rejectionReason.trim();
      // Clear downstream approval fields on rejection
      updateData.approvedById = null;
      updateData.approvedAt = null;
      updateData.paidById = null;
      updateData.paidAt = null;
      updateData.transactionRef = null;
      auditAction = 'REJECT';
    }
    // Handle forward status transition
    else if (body.status && body.status !== existing.status) {
      const newStatus = body.status as PaymentStatus;
      const currentStatus = existing.status;

      // Validate transition
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${currentStatus} to ${newStatus}` },
          { status: 400 },
        );
      }

      // Permission checks per transition
      switch (newStatus) {
        case 'SUBMITTED': {
          // Anyone with access to the entry can submit
          requirePermission(user, Permission.PAYMENTS_LIST);
          updateData.status = 'SUBMITTED';
          updateData.submittedAt = new Date();
          // Clear any prior rejection reason on resubmission
          updateData.rejectionReason = null;
          auditAction = 'SUBMIT';
          break;
        }
        case 'VERIFIED': {
          // Supervisor or admin
          requirePermission(user, Permission.PAYMENTS_VERIFY);
          updateData.status = 'VERIFIED';
          updateData.verifiedAt = new Date();
          auditAction = 'VERIFY';
          break;
        }
        case 'APPROVED': {
          // Finance or admin
          requirePermission(user, Permission.PAYMENTS_APPROVE);
          if (!isFinance(user) && !isAdmin(user)) {
            return NextResponse.json(
              { error: 'Only finance officers or admins can approve payments' },
              { status: 403 },
            );
          }
          updateData.status = 'APPROVED';
          updateData.approvedById = user.id;
          updateData.approvedAt = new Date();
          auditAction = 'APPROVE';
          break;
        }
        case 'PAID': {
          // Finance only, must have transactionRef
          requirePermission(user, Permission.PAYMENTS_MARK_PAID);
          if (!isFinance(user) && !isAdmin(user)) {
            return NextResponse.json(
              { error: 'Only finance officers can mark payments as paid' },
              { status: 403 },
            );
          }
          if (!body.transactionRef || typeof body.transactionRef !== 'string' || body.transactionRef.trim().length === 0) {
            return NextResponse.json(
              { error: 'Transaction reference is required when marking a payment as paid' },
              { status: 400 },
            );
          }
          updateData.status = 'PAID';
          updateData.paidById = user.id;
          updateData.paidAt = new Date();
          updateData.transactionRef = body.transactionRef.trim();
          auditAction = 'MARK_PAID';
          break;
        }
        case 'RECONCILED': {
          // Finance or admin
          if (!isFinance(user) && !isAdmin(user)) {
            return NextResponse.json(
              { error: 'Only finance officers or admins can reconcile payments' },
              { status: 403 },
            );
          }
          updateData.status = 'RECONCILED';
          updateData.reconciledAt = new Date();
          if (body.reconcileNote) {
            updateData.reconcileNote = body.reconcileNote;
          }
          auditAction = 'RECONCILE';
          break;
        }
        default:
          return NextResponse.json(
            { error: `Unknown target status: ${newStatus}` },
            { status: 400 },
          );
      }
    }

    // Handle non-status field updates (only for DRAFT payments)
    const editableFields = ['paymentCategory', 'amount', 'phone', 'network', 'overrideReason'] as const;
    for (const field of editableFields) {
      if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
        if (existing.status !== 'DRAFT' && !body.status) {
          return NextResponse.json(
            { error: 'Can only edit payment details while in DRAFT status' },
            { status: 400 },
          );
        }
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updated = await db.paymentRecord.update({
      where: { id },
      data: updateData,
      include: {
        namesEntry: {
          select: {
            id: true,
            fullName: true,
            visit: { select: { visitNumber: true } },
          },
        },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    // Audit log
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const key of Object.keys(updateData)) {
      before[key] = (existing as Record<string, unknown>)[key];
      after[key] = updateData[key];
    }

    createAuditLog({
      userId: user.id,
      action: auditAction,
      entity: 'PAYMENT',
      entityId: id,
      before,
      after: {
        ...after,
        fullName: existing.namesEntry.fullName,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log payment update:', err));

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[PATCH /api/payments/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
