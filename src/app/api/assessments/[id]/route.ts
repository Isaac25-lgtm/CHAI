import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter, canAccessDistrict } from '@/lib/rbac';
import { ASSESSMENT_SECTION_DEFS } from '@/config/assessment-sections';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/assessments/[id] — full assessment with responses and scores
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ASSESSMENTS_LIST);

    const { id } = await context.params;

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
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        responses: {
          include: {
            question: {
              select: {
                id: true,
                questionCode: true,
                questionText: true,
                responseType: true,
                sectionId: true,
                section: { select: { sectionNumber: true, title: true } },
              },
            },
          },
        },
        domainScores: {
          include: {
            section: {
              select: { sectionNumber: true, title: true, scoringParadigm: true },
            },
          },
          orderBy: { section: { sectionNumber: 'asc' } },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Check district access
    const scope = getScopeFilter(user);
    if (scope?.districtId && !canAccessDistrict(user, assessment.visit.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build a response map keyed by questionCode for easier consumption
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseMap: Record<string, any> = {};
    for (const r of assessment.responses) {
      responseMap[r.question.questionCode] = {
        id: r.id,
        questionId: r.questionId,
        questionCode: r.question.questionCode,
        value: r.value,
        numericValue: r.numericValue,
        evidenceNotes: r.evidenceNotes,
        sampledData: r.sampledData ? JSON.parse(r.sampledData) : null,
        sectionNumber: r.question.section.sectionNumber,
      };
    }

    return NextResponse.json({
      ...assessment,
      responseMap,
      sectionDefs: ASSESSMENT_SECTION_DEFS.map((s) => ({
        number: s.number,
        title: s.title,
        description: s.description,
        scoringParadigm: s.scoringParadigm,
        isScored: s.isScored,
        questionCount: s.questions.length,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/assessments/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/assessments/[id] — update responses (auto-save)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ASSESSMENTS_UPDATE);

    const { id } = await context.params;

    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        visit: { include: { facility: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assessment.status !== 'DRAFT' && assessment.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Only draft or in-progress assessments can be updated' },
        { status: 400 },
      );
    }

    // Check district access
    if (!canAccessDistrict(user, assessment.visit.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { responses } = body;

    if (!Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'responses must be an array' },
        { status: 400 },
      );
    }

    // Validate and map question codes to question IDs
    const questionCodes = responses.map((r: { questionCode: string }) => r.questionCode);
    const questions = await db.assessmentQuestion.findMany({
      where: { questionCode: { in: questionCodes } },
      select: { id: true, questionCode: true },
    });

    const codeToId = new Map(questions.map((q: { id: string; questionCode: string }) => [q.questionCode, q.id]));

    // Upsert responses in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
      for (const resp of responses) {
        const questionId = codeToId.get(resp.questionCode);
        if (!questionId) continue;

        await tx.assessmentResponse.upsert({
          where: {
            assessmentId_questionId: {
              assessmentId: id,
              questionId,
            },
          },
          create: {
            assessmentId: id,
            questionId,
            value: resp.value ?? null,
            numericValue: resp.numericValue ?? null,
            evidenceNotes: resp.evidenceNotes ?? null,
            sampledData: resp.sampledData ? JSON.stringify(resp.sampledData) : null,
          },
          update: {
            value: resp.value ?? null,
            numericValue: resp.numericValue ?? null,
            evidenceNotes: resp.evidenceNotes ?? null,
            sampledData: resp.sampledData ? JSON.stringify(resp.sampledData) : null,
          },
        });
      }

      // Compute completion percentage
      const totalQuestions = ASSESSMENT_SECTION_DEFS.reduce(
        (acc, s) => acc + s.questions.length,
        0,
      );
      const answeredCount = await tx.assessmentResponse.count({
        where: {
          assessmentId: id,
          value: { not: null },
        },
      });
      // Also count those with only numericValue or sampledData
      const numericOnly = await tx.assessmentResponse.count({
        where: {
          assessmentId: id,
          value: null,
          OR: [
            { numericValue: { not: null } },
            { sampledData: { not: null } },
          ],
        },
      });

      const totalAnswered = answeredCount + numericOnly;
      const completionPct = totalQuestions > 0
        ? Math.round((totalAnswered / totalQuestions) * 10000) / 100
        : 0;

      // Update assessment status and completion
      const newStatus = assessment.status === 'DRAFT' ? 'IN_PROGRESS' : assessment.status;

      await tx.assessment.update({
        where: { id },
        data: {
          status: newStatus,
          completionPct,
        },
      });
    });

    // Return updated assessment
    const updated = await db.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        completionPct: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[PATCH /api/assessments/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
