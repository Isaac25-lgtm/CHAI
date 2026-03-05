import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, canAccessDistrict } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { ASSESSMENT_SECTION_DEFS } from '@/config/assessment-sections';
import {
  computeFullAssessment,
  type ResponseMap,
  type QuestionResponse,
} from '@/lib/scoring';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/assessments/[id]/submit — score and submit an assessment
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ASSESSMENTS_SUBMIT);

    const { id } = await context.params;

    // Fetch the assessment with responses
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        visit: {
          include: {
            facility: {
              include: {
                district: { include: { region: true } },
              },
            },
          },
        },
        responses: {
          include: {
            question: {
              select: { questionCode: true, sectionId: true },
            },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assessment.status !== 'DRAFT' && assessment.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Only draft or in-progress assessments can be submitted' },
        { status: 400 },
      );
    }

    // Check district access
    if (!canAccessDistrict(user, assessment.visit.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build ResponseMap for the scoring engine
    const allResponses: ResponseMap = {};
    for (const resp of assessment.responses) {
      const qr: QuestionResponse = {
        value: resp.value,
        numericValue: resp.numericValue,
      };
      if (resp.sampledData) {
        try {
          qr.sampledData = JSON.parse(resp.sampledData);
        } catch {
          // ignore parse errors
        }
      }
      allResponses[resp.question.questionCode] = qr;
    }

    // Run scoring engine
    const {
      sectionResults,
      overallStatus,
      criticalFlags,
      scoredSectionCount,
      redCount,
      yellowCount,
      greenCount,
    } = computeFullAssessment(ASSESSMENT_SECTION_DEFS, allResponses);

    // Get section IDs from DB (needed for DomainScore records)
    const sections = await db.assessmentSection.findMany({
      select: { id: true, sectionNumber: true },
    });
    const sectionNumToId = new Map(sections.map((s: { id: string; sectionNumber: number }) => [s.sectionNumber, s.id]));

    const now = new Date();

    // Run everything in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
      // 1. Update assessment status
      await tx.assessment.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
          submittedById: user.id,
          completionPct: 100,
        },
      });

      // 2. Upsert DomainScore records for each section
      for (const result of sectionResults) {
        const sectionId = sectionNumToId.get(result.sectionNumber);
        if (!sectionId) continue;

        await tx.domainScore.upsert({
          where: {
            assessmentId_sectionId: {
              assessmentId: id,
              sectionId,
            },
          },
          create: {
            assessmentId: id,
            sectionId,
            rawScore: result.rawScore,
            maxScore: result.maxScore,
            percentage: result.percentage,
            colorStatus: result.colorStatus,
            criticalFlags: JSON.stringify(result.criticalFlags),
            details: JSON.stringify(result.details),
            computedAt: now,
          },
          update: {
            rawScore: result.rawScore,
            maxScore: result.maxScore,
            percentage: result.percentage,
            colorStatus: result.colorStatus,
            criticalFlags: JSON.stringify(result.criticalFlags),
            details: JSON.stringify(result.details),
            computedAt: now,
          },
        });
      }

      // 3. Compute lightGreen and darkGreen counts
      const lightGreenCount = sectionResults.filter(
        (r) => r.colorStatus === 'LIGHT_GREEN',
      ).length;
      const darkGreenCount = sectionResults.filter(
        (r) => r.colorStatus === 'DARK_GREEN',
      ).length;

      // Identify top RED domains for summary
      const topRedDomains = sectionResults
        .filter((r) => r.colorStatus === 'RED')
        .map((r) => {
          const sec = ASSESSMENT_SECTION_DEFS.find(
            (s) => s.number === r.sectionNumber,
          );
          return sec?.title ?? `Section ${r.sectionNumber}`;
        });

      // 4. Upsert VisitSummary
      await tx.visitSummary.upsert({
        where: { visitId: assessment.visitId },
        create: {
          visitId: assessment.visitId,
          overallStatus,
          redCount,
          yellowCount,
          lightGreenCount,
          darkGreenCount,
          totalScored: scoredSectionCount,
          completionPct: 100,
          criticalFlags: JSON.stringify(criticalFlags),
          topRedDomains: JSON.stringify(topRedDomains),
          computedAt: now,
        },
        update: {
          overallStatus,
          redCount,
          yellowCount,
          lightGreenCount,
          darkGreenCount,
          totalScored: scoredSectionCount,
          completionPct: 100,
          criticalFlags: JSON.stringify(criticalFlags),
          topRedDomains: JSON.stringify(topRedDomains),
          computedAt: now,
        },
      });
    });

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'SUBMIT',
      entity: 'ASSESSMENT',
      entityId: id,
      before: { status: assessment.status },
      after: {
        status: 'SUBMITTED',
        overallStatus,
        redCount,
        yellowCount,
        greenCount,
        criticalFlagsCount: criticalFlags.length,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log assessment submission:', err));

    // Return computed scores
    return NextResponse.json({
      id,
      status: 'SUBMITTED',
      submittedAt: now.toISOString(),
      overallStatus,
      sectionResults: sectionResults.map((r) => ({
        sectionNumber: r.sectionNumber,
        title: ASSESSMENT_SECTION_DEFS.find((s) => s.number === r.sectionNumber)?.title,
        rawScore: r.rawScore,
        maxScore: r.maxScore,
        percentage: r.percentage,
        colorStatus: r.colorStatus,
        criticalFlags: r.criticalFlags,
      })),
      summary: {
        overallStatus,
        redCount,
        yellowCount,
        greenCount,
        scoredSectionCount,
        criticalFlags,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/assessments/[id]/submit]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
