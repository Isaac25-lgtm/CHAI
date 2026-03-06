import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter, isFinance, isAdmin, canAccessDistrict, isSuperuser, isOwnRecord } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { paymentSchema } from '@/lib/validation';

// ---------------------------------------------------------------------------
// GET /api/payments — list payment records with filters + pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.PAYMENTS_LIST);

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const network = searchParams.get('network');
    const paymentCategory = searchParams.get('paymentCategory');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // Apply scope: only finance/admin can see all
    const scope = getScopeFilter(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Scope filter: non-finance/admin users see only their district
    if (scope?.districtId) {
      where.namesEntry = {
        visit: { facility: { districtId: scope.districtId } },
      };
    } else if (scope?.regionId) {
      where.namesEntry = {
        visit: { facility: { district: { regionId: scope.regionId } } },
      };
    }

    if (status) {
      const validStatuses = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'PAID', 'RECONCILED'];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }

    if (network) {
      const validNetworks = ['MTN', 'AIRTEL', 'OTHER'];
      if (validNetworks.includes(network)) {
        where.network = network;
      }
    }

    if (paymentCategory) {
      const validCategories = ['TRANSPORT', 'PER_DIEM', 'FACILITATION', 'OTHER'];
      if (validCategories.includes(paymentCategory)) {
        where.paymentCategory = paymentCategory;
      }
    }

    if (dateFrom) {
      where.createdAt = { ...(where.createdAt || {}), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.createdAt = { ...(where.createdAt || {}), lte: new Date(dateTo + 'T23:59:59.999Z') };
    }

    if (search) {
      where.OR = [
        { namesEntry: { fullName: { contains: search, mode: 'insensitive' } } },
        { phone: { contains: search, mode: 'insensitive' } },
        { transactionRef: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [payments, total] = await Promise.all([
      db.paymentRecord.findMany({
        where,
        include: {
          namesEntry: {
            select: {
              id: true,
              fullName: true,
              role: true,
              teamType: true,
              districtName: true,
              facilityName: true,
              phone: true,
              network: true,
              eligibility: true,
              verificationStatus: true,
              approvalStatus: true,
              visit: {
                select: {
                  id: true,
                  visitNumber: true,
                  visitDate: true,
                },
              },
            },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
          paidBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.paymentRecord.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/payments]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/payments — create a new payment record
// ---------------------------------------------------------------------------

const createPaymentSchema = paymentSchema.extend({
  namesEntryId: z.string().min(1, 'Names entry ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    // Assessors can create payments (via NAMES_CREATE), superusers via PAYMENTS_LIST
    requirePermission(user, isSuperuser(user) ? Permission.PAYMENTS_LIST : Permission.NAMES_CREATE);

    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Verify names entry exists and has no payment record yet
    const namesEntry = await db.namesRegistryEntry.findUnique({
      where: { id: data.namesEntryId },
      include: {
        paymentRecord: true,
        visit: { select: { createdById: true, facility: { select: { districtId: true } } } },
      },
    });

    if (!namesEntry) {
      return NextResponse.json({ error: 'Names registry entry not found' }, { status: 400 });
    }

    // Scope check: assessors can only create payments for their own visits
    if (!isSuperuser(user)) {
      const visitCreatedById = namesEntry.visit?.createdById;
      if (visitCreatedById && !isOwnRecord(user, visitCreatedById)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const districtId = namesEntry.visit?.facility?.districtId;
    if (districtId && !canAccessDistrict(user, districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (namesEntry.paymentRecord) {
      return NextResponse.json(
        { error: 'A payment record already exists for this names entry' },
        { status: 409 },
      );
    }

    const payment = await db.paymentRecord.create({
      data: {
        namesEntryId: data.namesEntryId,
        paymentCategory: data.paymentCategory,
        amount: data.amount,
        phone: data.phone,
        network: data.network,
        status: 'DRAFT',
      },
      include: {
        namesEntry: {
          select: { fullName: true, visitId: true },
        },
      },
    });

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'PAYMENT',
      entityId: payment.id,
      after: {
        namesEntryId: payment.namesEntryId,
        fullName: payment.namesEntry.fullName,
        amount: payment.amount,
        paymentCategory: payment.paymentCategory,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log payment creation:', err));

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/payments]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
