/**
 * CHAI PMTCT System - Data Quality Flag Generation
 *
 * Runs automated checks on submitted visits/assessments to identify
 * data quality issues: missing required responses, impossible values,
 * incomplete sections, and missing evidence notes.
 */

import { db } from './index';
import { ASSESSMENT_SECTION_DEFS } from '@/config/assessment-sections';
import type { QuestionDef, SectionDef } from '@/config/assessment-sections';

type DQFlagType = 'MISSING_VALUE' | 'IMPOSSIBLE_VALUE' | 'INCOMPLETE_SECTION' | 'MISSING_EVIDENCE';
type DQSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

interface DQFlagInput {
  visitId: string;
  entityType: 'ASSESSMENT';
  entityId: string;
  flagType: DQFlagType;
  severity: DQSeverity;
  description: string;
  fieldName: string | null;
  currentValue: string | null;
  suggestedFix: string | null;
}

// ---------------------------------------------------------------------------
// runDataQualityChecks
// ---------------------------------------------------------------------------

/**
 * Run all data quality checks on a submitted visit's assessment.
 * Creates DataQualityFlag records for each issue found.
 *
 * Checks performed:
 * 1. Missing required responses
 * 2. Impossible values (e.g., tested count > ANC1 denominator)
 * 3. Incomplete sections (some questions answered, others not)
 * 4. Missing evidence notes on required fields
 */
export async function runDataQualityChecks(visitId: string): Promise<void> {
  // Get the latest assessment for this visit
  const assessment = await db.assessment.findFirst({
    where: { visitId },
    orderBy: { createdAt: 'desc' },
    include: {
      responses: {
        include: {
          question: {
            include: {
              section: {
                select: { sectionNumber: true, title: true },
              },
            },
          },
        },
      },
    },
  });

  if (!assessment) {
    return;
  }

  // Build a lookup of responses by question code
  const responseMap = new Map<string, {
    value: string | null;
    numericValue: number | null;
    evidenceNotes: string | null;
    questionCode: string;
    questionText: string;
    sectionNumber: number;
    sectionTitle: string;
    isRequired: boolean;
    requiresEvidence: boolean;
  }>();

  for (const resp of assessment.responses) {
    responseMap.set(resp.question.questionCode, {
      value: resp.value,
      numericValue: resp.numericValue,
      evidenceNotes: resp.evidenceNotes,
      questionCode: resp.question.questionCode,
      questionText: resp.question.questionText,
      sectionNumber: resp.question.section.sectionNumber,
      sectionTitle: resp.question.section.title,
      isRequired: resp.question.isRequired,
      requiresEvidence: resp.question.requiresEvidence,
    });
  }

  // Collect all flags to insert
  const flags: DQFlagInput[] = [];

  // Clear existing unresolved flags for this visit to avoid duplicates
  await db.dataQualityFlag.deleteMany({
    where: {
      visitId,
      isResolved: false,
    },
  });

  // -----------------------------------------------------------------------
  // 1. Missing required responses
  // -----------------------------------------------------------------------
  for (const section of ASSESSMENT_SECTION_DEFS) {
    for (const question of section.questions) {
      if (!question.required) continue;

      // Check if the question is visible (branch condition met)
      if (question.branchCondition) {
        const parentResp = responseMap.get(question.branchCondition.questionCode);
        if (!isConditionMet(question.branchCondition, parentResp?.value ?? null)) {
          continue; // Question not visible; skip
        }
      }

      const resp = responseMap.get(question.code);
      const isMissing = !resp || (resp.value === null && resp.numericValue === null);

      if (isMissing) {
        flags.push({
          visitId,
          entityType: 'ASSESSMENT',
          entityId: assessment.id,
          flagType: 'MISSING_VALUE',
          severity: 'HIGH',
          description: `Required response missing for "${question.text}" in Section ${section.number} (${section.title})`,
          fieldName: question.code,
          currentValue: null,
          suggestedFix: 'Please provide a response for this required question.',
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // 2. Impossible values
  // -----------------------------------------------------------------------
  checkImpossibleValues(responseMap, visitId, assessment.id, flags);

  // -----------------------------------------------------------------------
  // 3. Incomplete sections
  // -----------------------------------------------------------------------
  checkIncompleteSections(ASSESSMENT_SECTION_DEFS, responseMap, visitId, assessment.id, flags);

  // -----------------------------------------------------------------------
  // 4. Missing evidence notes on required fields
  // -----------------------------------------------------------------------
  for (const section of ASSESSMENT_SECTION_DEFS) {
    for (const question of section.questions) {
      if (!question.requiresEvidence) continue;

      const resp = responseMap.get(question.code);
      if (!resp) continue; // Already flagged as missing

      // Only flag if the question was answered but evidence is missing
      const hasResponse = resp.value !== null || resp.numericValue !== null;
      const hasEvidence = resp.evidenceNotes !== null && resp.evidenceNotes.trim().length > 0;

      if (hasResponse && !hasEvidence) {
        flags.push({
          visitId,
          entityType: 'ASSESSMENT',
          entityId: assessment.id,
          flagType: 'MISSING_EVIDENCE',
          severity: 'MEDIUM',
          description: `Evidence notes required but missing for "${question.text}" in Section ${section.number} (${section.title})`,
          fieldName: question.code,
          currentValue: resp.value ?? String(resp.numericValue),
          suggestedFix: 'Please add evidence notes to support this response.',
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Bulk insert all flags
  // -----------------------------------------------------------------------
  if (flags.length > 0) {
    await db.dataQualityFlag.createMany({
      data: flags,
    });
  }
}

// ---------------------------------------------------------------------------
// Impossible value checks
// ---------------------------------------------------------------------------

function checkImpossibleValues(
  responseMap: Map<string, {
    value: string | null;
    numericValue: number | null;
    questionCode: string;
    questionText: string;
    sectionNumber: number;
    sectionTitle: string;
  }>,
  visitId: string,
  assessmentId: string,
  flags: DQFlagInput[],
): void {
  // Section 3: Testing numbers cannot exceed ANC1 denominator
  const anc1Resp = responseMap.get('S3_Q1');
  const anc1 = anc1Resp?.numericValue ?? null;

  if (anc1 !== null && anc1 >= 0) {
    const testingFields = [
      { code: 'S3_Q2', label: 'HIV tested' },
      { code: 'S3_Q4', label: 'Syphilis tested' },
      { code: 'S3_Q6', label: 'Hepatitis B tested' },
    ];

    for (const field of testingFields) {
      const resp = responseMap.get(field.code);
      if (resp?.numericValue !== null && resp?.numericValue !== undefined && resp.numericValue > anc1) {
        flags.push({
          visitId,
          entityType: 'ASSESSMENT',
          entityId: assessmentId,
          flagType: 'IMPOSSIBLE_VALUE',
          severity: 'HIGH',
          description: `${field.label} count (${resp.numericValue}) exceeds ANC1 total (${anc1}) in Section 3. The number tested cannot be greater than the denominator.`,
          fieldName: field.code,
          currentValue: String(resp.numericValue),
          suggestedFix: `Verify the ${field.label} count. It should not exceed the ANC1 total of ${anc1}.`,
        });
      }
    }
  }

  // Section 4: Positive cases on treatment cannot exceed positive cases
  const linkagePairs: [string, string, string, string][] = [
    ['S4_Q1', 'S4_Q2', 'HIV positive', 'HIV on ART'],
    ['S4_Q3', 'S4_Q4', 'Syphilis positive', 'Syphilis treated'],
    ['S4_Q5', 'S4_Q6', 'HBV positive', 'HBV managed'],
  ];

  for (const [denCode, numCode, denLabel, numLabel] of linkagePairs) {
    const den = responseMap.get(denCode)?.numericValue ?? null;
    const num = responseMap.get(numCode)?.numericValue ?? null;

    if (den !== null && num !== null && num > den) {
      flags.push({
        visitId,
        entityType: 'ASSESSMENT',
        entityId: assessmentId,
        flagType: 'IMPOSSIBLE_VALUE',
        severity: 'HIGH',
        description: `${numLabel} count (${num}) exceeds ${denLabel} count (${den}) in Section 4. Treatment count cannot exceed positive cases.`,
        fieldName: numCode,
        currentValue: String(num),
        suggestedFix: `Verify the ${numLabel} count. It should not exceed the ${denLabel} count of ${den}.`,
      });
    }
  }

  // General: negative numeric values
  for (const [code, resp] of responseMap.entries()) {
    if (resp.numericValue !== null && resp.numericValue < 0) {
      flags.push({
        visitId,
        entityType: 'ASSESSMENT',
        entityId: assessmentId,
        flagType: 'IMPOSSIBLE_VALUE',
        severity: 'HIGH',
        description: `Negative value (${resp.numericValue}) for "${resp.questionText}" in Section ${resp.sectionNumber}. Numeric values should be non-negative.`,
        fieldName: code,
        currentValue: String(resp.numericValue),
        suggestedFix: 'Please enter a non-negative value.',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Incomplete section checks
// ---------------------------------------------------------------------------

function checkIncompleteSections(
  sections: SectionDef[],
  responseMap: Map<string, {
    value: string | null;
    numericValue: number | null;
    questionCode: string;
  }>,
  visitId: string,
  assessmentId: string,
  flags: DQFlagInput[],
): void {
  for (const section of sections) {
    // Count visible questions (exclude branched-out ones)
    const visibleQuestions = section.questions.filter((q) => {
      if (!q.branchCondition) return true;
      const parentResp = responseMap.get(q.branchCondition.questionCode);
      return isConditionMet(q.branchCondition, parentResp?.value ?? null);
    });

    if (visibleQuestions.length === 0) continue;

    let answered = 0;
    let unanswered = 0;

    for (const q of visibleQuestions) {
      const resp = responseMap.get(q.code);
      if (resp && (resp.value !== null || resp.numericValue !== null)) {
        answered++;
      } else {
        unanswered++;
      }
    }

    // Flag sections that are partially complete (some answered, some not)
    // but not if all are answered or none are answered
    if (answered > 0 && unanswered > 0) {
      const completionPct = Math.round((answered / visibleQuestions.length) * 100);
      flags.push({
        visitId,
        entityType: 'ASSESSMENT',
        entityId: assessmentId,
        flagType: 'INCOMPLETE_SECTION',
        severity: completionPct < 50 ? 'HIGH' : 'MEDIUM',
        description: `Section ${section.number} (${section.title}) is ${completionPct}% complete: ${answered} of ${visibleQuestions.length} questions answered.`,
        fieldName: `section_${section.number}`,
        currentValue: `${answered}/${visibleQuestions.length}`,
        suggestedFix: `Complete the remaining ${unanswered} questions in Section ${section.number}.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Branch condition evaluation
// ---------------------------------------------------------------------------

function isConditionMet(
  condition: NonNullable<QuestionDef['branchCondition']>,
  parentValue: string | null,
): boolean {
  if (parentValue === null) return false;

  switch (condition.operator) {
    case 'eq':
      return parentValue === condition.value;
    case 'neq':
      return parentValue !== condition.value;
    case 'gt':
      return Number(parentValue) > Number(condition.value);
    case 'lt':
      return Number(parentValue) < Number(condition.value);
    default:
      return false;
  }
}
