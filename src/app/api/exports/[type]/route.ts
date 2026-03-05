/**
 * CHAI PMTCT System - Export API Route
 *
 * GET /api/exports/[type]?format=excel|csv&...filters
 *
 * Dynamic route where [type] is one of:
 *   raw-assessment, analyzed-assessment, facility-summary, district-summary,
 *   national-summary, action-plan, names-registry, payment, data-quality, audit-log
 *
 * Returns the generated file with proper content-type headers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import {
  requirePermission,
  hasPermission,
  Permission,
  isFinance,
  isAdmin,
} from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import {
  generateRawAssessmentExport,
  generateAnalyzedAssessmentExport,
  generateFacilitySummaryExport,
  generateDistrictSummaryExport,
  generateActionPlanExport,
  generateNamesRegistryExport,
  generatePaymentExport,
  generateDataQualityExport,
  generateAuditLogExport,
  generateExcelBuffer,
  generateCSVString,
} from '@/lib/exports';
import type { ExportType, ExportFormat } from '@/generated/prisma/enums';
import type { SessionUser } from '@/types';

// ---------------------------------------------------------------------------
// Type mapping
// ---------------------------------------------------------------------------

const EXPORT_TYPE_MAP: Record<string, ExportType> = {
  'raw-assessment': 'RAW_ASSESSMENT',
  'analyzed-assessment': 'ANALYZED_ASSESSMENT',
  'facility-summary': 'FACILITY_SUMMARY',
  'district-summary': 'DISTRICT_SUMMARY',
  'national-summary': 'NATIONAL_SUMMARY',
  'action-plan': 'ACTION_PLAN',
  'names-registry': 'NAMES_REGISTRY',
  'payment': 'PAYMENT',
  'data-quality': 'DATA_QUALITY',
  'audit-log': 'AUDIT_LOG',
};

// ---------------------------------------------------------------------------
// Permission check per export type
// ---------------------------------------------------------------------------

function checkExportPermission(type: string, user: SessionUser): void {
  switch (type) {
    case 'raw-assessment':
      requirePermission(user, Permission.EXPORTS_RAW);
      break;
    case 'analyzed-assessment':
      requirePermission(user, Permission.EXPORTS_ANALYZED);
      break;
    case 'facility-summary':
      requirePermission(user, Permission.EXPORTS_FACILITY);
      break;
    case 'district-summary':
      requirePermission(user, Permission.EXPORTS_DISTRICT);
      break;
    case 'national-summary':
      requirePermission(user, Permission.EXPORTS_NATIONAL);
      break;
    case 'action-plan':
      requirePermission(user, Permission.EXPORTS_ACTION_PLAN);
      break;
    case 'names-registry':
      requirePermission(user, Permission.EXPORTS_NAMES);
      break;
    case 'payment':
      if (!hasPermission(user, Permission.PAYMENTS_EXPORT) && !isFinance(user)) {
        throw new Error(
          `Forbidden: role "${user.role}" does not grant payment export access`,
        );
      }
      break;
    case 'data-quality':
      requirePermission(user, Permission.EXPORTS_DATA_QUALITY);
      break;
    case 'audit-log':
      if (!hasPermission(user, Permission.AUDIT_VIEW) && !isAdmin(user)) {
        throw new Error(
          `Forbidden: role "${user.role}" does not grant audit log export access`,
        );
      }
      break;
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

// ---------------------------------------------------------------------------
// Data generator dispatch
// ---------------------------------------------------------------------------

async function generateExportData(
  type: string,
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Record<string, unknown>[]> {
  switch (type) {
    case 'raw-assessment':
      return generateRawAssessmentExport(filters, user);
    case 'analyzed-assessment':
      return generateAnalyzedAssessmentExport(filters, user);
    case 'facility-summary':
      return generateFacilitySummaryExport(filters, user);
    case 'district-summary':
    case 'national-summary':
      // National summary uses the same generator but without district filter
      return generateDistrictSummaryExport(filters, user);
    case 'action-plan':
      return generateActionPlanExport(filters, user);
    case 'names-registry':
      return generateNamesRegistryExport(filters, user);
    case 'payment':
      return generatePaymentExport(filters, user);
    case 'data-quality':
      return generateDataQualityExport(filters, user);
    case 'audit-log':
      return generateAuditLogExport(filters, user);
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

// ---------------------------------------------------------------------------
// Sheet name mapping for Excel
// ---------------------------------------------------------------------------

const SHEET_NAMES: Record<string, string> = {
  'raw-assessment': 'Raw Assessment Data',
  'analyzed-assessment': 'Analyzed Assessments',
  'facility-summary': 'Facility Summary',
  'district-summary': 'District Summary',
  'national-summary': 'National Summary',
  'action-plan': 'Action Plans',
  'names-registry': 'Names Registry',
  'payment': 'Payments',
  'data-quality': 'Data Quality',
  'audit-log': 'Audit Logs',
};

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const user = await requireAuth();
    const { type } = await params;

    // Validate export type
    if (!EXPORT_TYPE_MAP[type]) {
      return NextResponse.json(
        { error: `Invalid export type: ${type}` },
        { status: 400 },
      );
    }

    // Check permissions
    checkExportPermission(type, user);

    // Parse format
    const { searchParams } = request.nextUrl;
    const formatParam = (searchParams.get('format') ?? 'excel').toLowerCase();

    if (formatParam !== 'excel' && formatParam !== 'csv') {
      return NextResponse.json(
        { error: 'Invalid format. Use "excel" or "csv".' },
        { status: 400 },
      );
    }

    // Collect filter params (pass through all query params except 'format')
    const filters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'format') {
        filters[key] = value;
      }
    });

    // Generate data
    const data = await generateExportData(type, filters, user);

    // Generate file
    const exportFormat: ExportFormat = formatParam === 'csv' ? 'CSV' : 'EXCEL';
    const timestamp = new Date().toISOString().slice(0, 10);
    const baseFileName = `chai-${type}-${timestamp}`;

    let fileBuffer: Buffer | string;
    let contentType: string;
    let fileName: string;

    if (formatParam === 'csv') {
      fileBuffer = generateCSVString(data);
      contentType = 'text/csv; charset=utf-8';
      fileName = `${baseFileName}.csv`;
    } else {
      fileBuffer = generateExcelBuffer(data, SHEET_NAMES[type] ?? 'Export');
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileName = `${baseFileName}.xlsx`;
    }

    // Log export to ExportLog table (non-blocking)
    db.exportLog
      .create({
        data: {
          userId: user.id,
          exportType: EXPORT_TYPE_MAP[type],
          format: exportFormat,
          filters: Object.keys(filters).length > 0 ? JSON.stringify(filters) : null,
          fileName,
          rowCount: data.length,
        },
      })
      .catch((err: unknown) =>
        console.error('[EXPORT] Failed to log export:', err),
      );

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'EXPORT',
      entity: 'EXPORT',
      metadata: {
        exportType: type,
        format: formatParam,
        rowCount: data.length,
        fileName,
        filters,
      },
    }).catch((err) =>
      console.error('[AUDIT] Failed to log export action:', err),
    );

    // Return file response
    const body =
      typeof fileBuffer === 'string'
        ? new TextEncoder().encode(fileBuffer)
        : new Uint8Array(fileBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    if (
      message === 'Unauthorized' ||
      message === 'Authentication required'
    ) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/exports]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
