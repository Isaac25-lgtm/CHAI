/**
 * CHAI PMTCT Scoring Engine
 *
 * Computes section-level and overall assessment scores based on the
 * data-driven question definitions and collected responses.
 *
 * Scoring paradigms:
 *   MATURITY_LADDER   – depth of YES answers in a branching chain
 *   PERCENTAGE_BASED  – numerator / denominator percentages
 *   COUNT_BASED       – counts of achieved vs eligible
 *   COMPOSITE         – weighted combination of sub-scores
 *   DESCRIPTIVE       – no score; data capture only
 */

import type {
  SectionDef,
  QuestionDef,
} from '@/config/assessment-sections';
import { isQuestionVisible } from '@/config/assessment-sections';
import type { ColorStatus } from '@/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface QuestionResponse {
  value: string | null;
  numericValue: number | null;
  sampledData?: Record<string, string>[];
}

export interface ResponseMap {
  [questionCode: string]: QuestionResponse;
}

export interface SectionScoreResult {
  sectionNumber: number;
  rawScore: number | null;
  maxScore: number | null;
  percentage: number | null;
  colorStatus: ColorStatus;
  criticalFlags: string[];
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getVal(responses: ResponseMap, code: string): string | null {
  return responses[code]?.value ?? null;
}

function getNum(responses: ResponseMap, code: string): number | null {
  const r = responses[code];
  if (!r) return null;
  if (r.numericValue !== null && r.numericValue !== undefined) return r.numericValue;
  if (r.value !== null && !isNaN(Number(r.value))) return Number(r.value);
  return null;
}

function isYes(responses: ResponseMap, code: string): boolean {
  return getVal(responses, code) === 'YES';
}

function isNo(responses: ResponseMap, code: string): boolean {
  return getVal(responses, code) === 'NO';
}

function percentageToColor(pct: number): ColorStatus {
  if (pct < 50) return 'RED';
  if (pct < 75) return 'YELLOW';
  if (pct < 90) return 'LIGHT_GREEN';
  return 'DARK_GREEN';
}

function safePct(numerator: number | null, denominator: number | null): number | null {
  if (denominator === null || denominator === 0 || numerator === null) return null;
  return Math.round((numerator / denominator) * 10000) / 100; // 2 decimal places
}

/**
 * Build a flat map of question values for use in branching visibility checks.
 */
function buildValueMap(responses: ResponseMap): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const [code, resp] of Object.entries(responses)) {
    map[code] = resp.value;
  }
  return map;
}

// ---------------------------------------------------------------------------
// MATURITY LADDER scoring
// ---------------------------------------------------------------------------

function scoreMaturityLadder(
  section: SectionDef,
  responses: ResponseMap,
): SectionScoreResult {
  const valueMap = buildValueMap(responses);
  const visibleQuestions = section.questions.filter((q) =>
    isQuestionVisible(q, valueMap),
  );

  const yesNoQuestions = visibleQuestions.filter(
    (q) => q.responseType === 'YES_NO' || q.responseType === 'YES_NO_NA',
  );

  const totalVisible = yesNoQuestions.length;
  const yesCount = yesNoQuestions.filter((q) => isYes(responses, q.code)).length;
  const noCount = yesNoQuestions.filter((q) => isNo(responses, q.code)).length;

  // Identify SOP / formalisation questions (contain "SOP" or "written" in text)
  const sopQuestions = yesNoQuestions.filter(
    (q) =>
      q.text.toLowerCase().includes('sop') ||
      q.text.toLowerCase().includes('written'),
  );
  const hasSopQuestions = sopQuestions.length > 0;
  const allSopsYes =
    hasSopQuestions && sopQuestions.every((q) => isYes(responses, q.code));

  // Non-SOP questions
  const nonSopQuestions = yesNoQuestions.filter(
    (q) =>
      !q.text.toLowerCase().includes('sop') &&
      !q.text.toLowerCase().includes('written'),
  );
  const nonSopYes = nonSopQuestions.filter((q) => isYes(responses, q.code)).length;
  const nonSopTotal = nonSopQuestions.length;

  let colorStatus: ColorStatus;
  const criticalFlags: string[] = [];

  if (totalVisible === 0) {
    colorStatus = 'NOT_SCORED';
  } else if (yesCount === 0 || (noCount > 0 && yesCount === 0)) {
    // All NO at first level
    colorStatus = 'RED';
    criticalFlags.push(`${section.title}: No capability demonstrated`);
  } else if (nonSopTotal > 0 && nonSopYes < nonSopTotal * 0.5) {
    // Less than half of non-SOP items achieved
    colorStatus = 'RED';
    criticalFlags.push(`${section.title}: Critical gaps in basic functions`);
  } else if (nonSopTotal > 0 && nonSopYes < nonSopTotal) {
    // Some but not all non-SOP items
    colorStatus = 'YELLOW';
  } else if (hasSopQuestions && !allSopsYes) {
    // All operational items YES but SOP/formalisation missing
    colorStatus = 'LIGHT_GREEN';
  } else {
    // Everything YES including formalisation
    colorStatus = 'DARK_GREEN';
  }

  const pct = totalVisible > 0 ? safePct(yesCount, totalVisible) : null;

  return {
    sectionNumber: section.number,
    rawScore: yesCount,
    maxScore: totalVisible,
    percentage: pct,
    colorStatus,
    criticalFlags,
    details: {
      paradigm: 'MATURITY_LADDER',
      totalVisibleQuestions: totalVisible,
      yesCount,
      noCount,
      sopQuestionsCount: sopQuestions.length,
      allSopsYes,
    },
  };
}

// ---------------------------------------------------------------------------
// PERCENTAGE BASED scoring
// ---------------------------------------------------------------------------

/**
 * For Section 3: Testing coverage = average of (HIV tested/ANC1, Syph tested/ANC1, HBV tested/ANC1)
 * For Section 4: Linkage = average of (HIV on ART/HIV+, Syph treated/Syph+, HBV managed/HBV+)
 */
function scorePercentageBased(
  section: SectionDef,
  responses: ResponseMap,
): SectionScoreResult {
  const criticalFlags: string[] = [];
  const pctComponents: number[] = [];
  const details: Record<string, unknown> = { paradigm: 'PERCENTAGE_BASED', components: [] as Record<string, unknown>[] };

  if (section.number === 3) {
    // Triple Elimination Testing
    const anc1 = getNum(responses, 'S3_Q1');
    const hivTested = getNum(responses, 'S3_Q2');
    const syphTested = getNum(responses, 'S3_Q4');
    const hbvTested = getNum(responses, 'S3_Q6');

    const pairs: [string, number | null, string][] = [
      ['HIV testing coverage', hivTested, 'S3_Q2'],
      ['Syphilis testing coverage', syphTested, 'S3_Q4'],
      ['Hepatitis B testing coverage', hbvTested, 'S3_Q6'],
    ];

    for (const [label, numerator, code] of pairs) {
      const pct = safePct(numerator, anc1);
      if (pct !== null) {
        pctComponents.push(pct);
        (details.components as Record<string, unknown>[]).push({ label, numerator, denominator: anc1, percentage: pct, code });
        if (pct < 50) {
          criticalFlags.push(`${label} RED (${pct}%)`);
        }
      }
    }

    // Also note qualitative indicators
    if (isNo(responses, 'S3_Q8')) {
      criticalFlags.push('HIV re-testing of negative women not done');
    }
  } else if (section.number === 4) {
    // Triple Elimination Linkage
    const linkagePairs: [string, string, string][] = [
      ['HIV ART linkage', 'S4_Q2', 'S4_Q1'],
      ['Syphilis treatment linkage', 'S4_Q4', 'S4_Q3'],
      ['HBV management linkage', 'S4_Q6', 'S4_Q5'],
    ];

    for (const [label, numCode, denCode] of linkagePairs) {
      const num = getNum(responses, numCode);
      const den = getNum(responses, denCode);
      // If denominator is 0 (no positives), skip this component
      if (den !== null && den > 0) {
        const pct = safePct(num, den);
        if (pct !== null) {
          pctComponents.push(pct);
          (details.components as Record<string, unknown>[]).push({ label, numerator: num, denominator: den, percentage: pct });
          if (pct < 50) {
            criticalFlags.push(`${label} RED (${pct}%)`);
          }
        }
      }
    }
  }

  const avgPct =
    pctComponents.length > 0
      ? Math.round((pctComponents.reduce((a, b) => a + b, 0) / pctComponents.length) * 100) / 100
      : null;

  const colorStatus: ColorStatus = avgPct !== null ? percentageToColor(avgPct) : 'NOT_SCORED';

  details.averagePercentage = avgPct;

  return {
    sectionNumber: section.number,
    rawScore: avgPct !== null ? Math.round(avgPct) : null,
    maxScore: 100,
    percentage: avgPct,
    colorStatus,
    criticalFlags,
    details,
  };
}

// ---------------------------------------------------------------------------
// COUNT BASED scoring
// ---------------------------------------------------------------------------

function scoreCountBased(
  section: SectionDef,
  responses: ResponseMap,
): SectionScoreResult {
  const criticalFlags: string[] = [];
  const details: Record<string, unknown> = { paradigm: 'COUNT_BASED' };

  let percentage: number | null = null;

  if (section.number === 9) {
    // STI Screening: count YES answers + chart review proportion
    const yesCount = ['S9_Q1', 'S9_Q2', 'S9_Q3'].filter((c) => isYes(responses, c)).length;
    const chartCount = getNum(responses, 'S9_Q4') ?? 0;
    // Total possible: 3 YES questions + 10 charts = weight equally
    // Score = (yesCount/3 * 50) + (chartCount/10 * 50)
    const yesPct = (yesCount / 3) * 100;
    const chartPct = (chartCount / 10) * 100;
    percentage = Math.round(((yesPct + chartPct) / 2) * 100) / 100;
    details.yesCount = yesCount;
    details.chartScreenedCount = chartCount;
    details.yesPct = yesPct;
    details.chartPct = chartPct;

    if (isNo(responses, 'S9_Q1')) {
      criticalFlags.push('Syndromic STI screening not routinely done in ANC');
    }
  } else if (section.number === 11) {
    // CTX for HEI
    const eligible = getNum(responses, 'S11_Q1');
    const initiated = getNum(responses, 'S11_Q2');
    percentage = safePct(initiated, eligible);
    details.eligible = eligible;
    details.initiated = initiated;
    details.ctxDocumented = getVal(responses, 'S11_Q3');

    if (isNo(responses, 'S11_Q3')) {
      criticalFlags.push('CTX prophylaxis documentation missing in HEI records');
    }
    if (percentage !== null && percentage < 50) {
      criticalFlags.push(`CTX initiation rate critically low (${percentage}%)`);
    }
  } else if (section.number === 13) {
    // Enrolment of HIV-infected infants
    const diagnosed = getNum(responses, 'S13_Q1');
    const initiated = getNum(responses, 'S13_Q2');
    const documented = getNum(responses, 'S13_Q3');
    const linked = getNum(responses, 'S13_Q4');

    // Average of sub-ratios where denominator > 0
    const ratios: number[] = [];
    if (diagnosed !== null && diagnosed > 0) {
      const r1 = safePct(initiated, diagnosed);
      if (r1 !== null) ratios.push(r1);
      const r2 = safePct(documented, diagnosed);
      if (r2 !== null) ratios.push(r2);
      const r3 = safePct(linked, diagnosed);
      if (r3 !== null) ratios.push(r3);
    }

    percentage =
      ratios.length > 0
        ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) / 100
        : null;

    details.diagnosed = diagnosed;
    details.initiated = initiated;
    details.documented = documented;
    details.linked = linked;
    details.subRatios = ratios;

    if (percentage !== null && percentage < 50) {
      criticalFlags.push(`HIV-infected infant ART enrolment critically low (${percentage}%)`);
    }
  }

  const colorStatus: ColorStatus =
    percentage !== null ? percentageToColor(percentage) : 'NOT_SCORED';

  return {
    sectionNumber: section.number,
    rawScore: percentage !== null ? Math.round(percentage) : null,
    maxScore: 100,
    percentage,
    colorStatus,
    criticalFlags,
    details,
  };
}

// ---------------------------------------------------------------------------
// COMPOSITE scoring
// ---------------------------------------------------------------------------

function scoreComposite(
  section: SectionDef,
  responses: ResponseMap,
): SectionScoreResult {
  const criticalFlags: string[] = [];
  const details: Record<string, unknown> = { paradigm: 'COMPOSITE' };

  let percentage: number | null = null;

  if (section.number === 5) {
    // Part A – Service availability (YES/NO questions S5_A1..S5_A7)
    const valueMap = buildValueMap(responses);
    const partAQuestions = section.questions.filter(
      (q) => q.code.startsWith('S5_A') && isQuestionVisible(q, valueMap),
    );
    const partAYes = partAQuestions.filter((q) => isYes(responses, q.code)).length;
    const partATotal = partAQuestions.length;
    const partAPct = partATotal > 0 ? (partAYes / partATotal) * 100 : null;

    // Part B – 10-Chart audit
    const chartResponse = responses['S5_B_CHARTS'];
    let partBPct: number | null = null;
    if (chartResponse?.sampledData && chartResponse.sampledData.length > 0) {
      const rows = chartResponse.sampledData;
      let totalChecks = 0;
      let totalYes = 0;

      for (const row of rows) {
        for (const [, val] of Object.entries(row)) {
          if (val === 'YES' || val === 'NO') {
            totalChecks++;
            if (val === 'YES') totalYes++;
          }
        }
      }

      partBPct = totalChecks > 0 ? (totalYes / totalChecks) * 100 : null;
    }

    details.partA = { yesCount: partAYes, total: partATotal, percentage: partAPct };
    details.partB = { percentage: partBPct, chartsReviewed: chartResponse?.sampledData?.length ?? 0 };

    // Weighted composite: Part A = 40%, Part B = 60%
    if (partAPct !== null && partBPct !== null) {
      percentage = Math.round((partAPct * 0.4 + partBPct * 0.6) * 100) / 100;
    } else if (partAPct !== null) {
      percentage = Math.round(partAPct * 100) / 100;
    } else if (partBPct !== null) {
      percentage = Math.round(partBPct * 100) / 100;
    }

    if (isNo(responses, 'S5_A5')) {
      criticalFlags.push('Viral load testing not done for PMTCT clients');
    }
    if (isNo(responses, 'S5_A7')) {
      criticalFlags.push('CTX prophylaxis not provided to eligible PMTCT clients');
    }
  } else if (section.number === 10) {
    // EID – on-site vs referral branches
    if (isYes(responses, 'S10_Q1')) {
      // On-site
      const eligible = getNum(responses, 'S10_Q2');
      const collected = getNum(responses, 'S10_Q3');
      const returned = getNum(responses, 'S10_Q4');
      const disclosed = getNum(responses, 'S10_Q5');

      const ratios: number[] = [];
      const collectedPct = safePct(collected, eligible);
      const returnedPct = safePct(returned, collected);
      const disclosedPct = safePct(disclosed, returned);

      if (collectedPct !== null) ratios.push(collectedPct);
      if (returnedPct !== null) ratios.push(returnedPct);
      if (disclosedPct !== null) ratios.push(disclosedPct);

      percentage =
        ratios.length > 0
          ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) / 100
          : null;

      details.mode = 'ONSITE';
      details.eligible = eligible;
      details.collected = collected;
      details.returned = returned;
      details.disclosed = disclosed;
      details.collectedPct = collectedPct;
      details.returnedPct = returnedPct;
      details.disclosedPct = disclosedPct;

      if (returnedPct !== null && returnedPct < 50) {
        criticalFlags.push(`EID results return rate RED (${returnedPct}%)`);
      }
      if (disclosedPct !== null && disclosedPct < 50) {
        criticalFlags.push(`EID results disclosure rate RED (${disclosedPct}%)`);
      }
    } else {
      // Referral
      const referred = getNum(responses, 'S10_Q7');
      const confirmed = getNum(responses, 'S10_Q8');
      const hasProcess = isYes(responses, 'S10_Q6');

      percentage = safePct(confirmed, referred);

      details.mode = 'REFERRAL';
      details.hasReferralProcess = hasProcess;
      details.referred = referred;
      details.confirmedCollected = confirmed;

      if (!hasProcess) {
        criticalFlags.push('No documented referral process for DBS collection');
      }
      if (percentage !== null && percentage < 50) {
        criticalFlags.push(`Referral DBS collection confirmation rate RED (${percentage}%)`);
      }
    }
  } else if (section.number === 15) {
    // Supply chain – 4 sub-sections (A, B, C, D)
    const subSections = ['A', 'B', 'C', 'D'] as const;
    const subLabels: Record<string, string> = {
      A: 'EID',
      B: 'HIV PMTCT',
      C: 'Syphilis',
      D: 'Hepatitis B',
    };
    const subScores: number[] = [];
    const subDetails: Record<string, unknown>[] = [];

    for (const sub of subSections) {
      const inStock = isYes(responses, `S15_${sub}1`);
      const stockOut = isYes(responses, `S15_${sub}2`); // YES = bad (stock-out occurred)
      const emergencyOrder = isYes(responses, `S15_${sub}3`); // YES = bad

      // Score: in stock = 40pts, no stock-out = 40pts, no emergency = 20pts
      let score = 0;
      if (inStock) score += 40;
      if (!stockOut) score += 40;
      if (!emergencyOrder) score += 20;

      subScores.push(score);
      subDetails.push({
        subSection: sub,
        label: subLabels[sub],
        inStock,
        stockOut,
        emergencyOrder,
        score,
      });

      if (!inStock) {
        criticalFlags.push(`${subLabels[sub]} commodities not in stock`);
      }
      if (stockOut) {
        criticalFlags.push(`${subLabels[sub]} stock-out interrupted services`);
      }
    }

    percentage =
      subScores.length > 0
        ? Math.round((subScores.reduce((a, b) => a + b, 0) / subScores.length) * 100) / 100
        : null;

    details.subSections = subDetails;
  }

  const colorStatus: ColorStatus =
    percentage !== null ? percentageToColor(percentage) : 'NOT_SCORED';

  return {
    sectionNumber: section.number,
    rawScore: percentage !== null ? Math.round(percentage) : null,
    maxScore: 100,
    percentage,
    colorStatus,
    criticalFlags,
    details,
  };
}

// ---------------------------------------------------------------------------
// DESCRIPTIVE scoring (no score)
// ---------------------------------------------------------------------------

function scoreDescriptive(
  section: SectionDef,
  responses: ResponseMap,
): SectionScoreResult {
  const details: Record<string, unknown> = { paradigm: 'DESCRIPTIVE' };

  // Capture all responses for analytics
  for (const q of section.questions) {
    const resp = responses[q.code];
    if (resp) {
      details[q.code] = {
        question: q.text,
        value: resp.value,
        numericValue: resp.numericValue,
      };
    }
  }

  return {
    sectionNumber: section.number,
    rawScore: null,
    maxScore: null,
    percentage: null,
    colorStatus: 'NOT_SCORED',
    criticalFlags: [],
    details,
  };
}

// ---------------------------------------------------------------------------
// Main scoring dispatch
// ---------------------------------------------------------------------------

/**
 * Compute the score for a single section given its definition and responses.
 */
export function computeSectionScore(
  section: SectionDef,
  responses: ResponseMap,
): SectionScoreResult {
  switch (section.scoringParadigm) {
    case 'MATURITY_LADDER':
      return scoreMaturityLadder(section, responses);
    case 'PERCENTAGE_BASED':
      return scorePercentageBased(section, responses);
    case 'COUNT_BASED':
      return scoreCountBased(section, responses);
    case 'COMPOSITE':
      return scoreComposite(section, responses);
    case 'DESCRIPTIVE':
      return scoreDescriptive(section, responses);
    default: {
      // Exhaustive check
      const _exhaustive: never = section.scoringParadigm;
      throw new Error(`Unknown scoring paradigm: ${_exhaustive}`);
    }
  }
}

/**
 * Compute the overall assessment color status from all section results.
 *
 * Rules:
 *   - If any scored section is RED -> overall RED
 *   - If any scored section is YELLOW but none RED -> overall YELLOW
 *   - Otherwise, use the most common scored status
 */
export function computeOverallStatus(
  sectionResults: SectionScoreResult[],
): ColorStatus {
  const scored = sectionResults.filter((r) => r.colorStatus !== 'NOT_SCORED');

  if (scored.length === 0) return 'NOT_SCORED';

  // Check for RED
  if (scored.some((r) => r.colorStatus === 'RED')) return 'RED';

  // Check for YELLOW
  if (scored.some((r) => r.colorStatus === 'YELLOW')) return 'YELLOW';

  // Count remaining statuses
  const counts: Record<string, number> = {};
  for (const r of scored) {
    counts[r.colorStatus] = (counts[r.colorStatus] ?? 0) + 1;
  }

  // Return the most common
  let maxCount = 0;
  let maxStatus: ColorStatus = 'LIGHT_GREEN';
  for (const [status, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxStatus = status as ColorStatus;
    }
  }

  return maxStatus;
}

/**
 * Aggregate all critical flags from section results.
 * Returns a de-duplicated list of flag strings.
 */
export function generateCriticalFlags(
  sectionResults: SectionScoreResult[],
): string[] {
  const flags: string[] = [];
  const seen = new Set<string>();

  for (const result of sectionResults) {
    for (const flag of result.criticalFlags) {
      if (!seen.has(flag)) {
        seen.add(flag);
        flags.push(flag);
      }
    }
  }

  return flags;
}

/**
 * Compute all section scores and an overall result for a full assessment.
 */
export function computeFullAssessment(
  sections: SectionDef[],
  allResponses: ResponseMap,
): {
  sectionResults: SectionScoreResult[];
  overallStatus: ColorStatus;
  criticalFlags: string[];
  scoredSectionCount: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
} {
  const sectionResults = sections.map((section) => {
    // Filter responses to only this section's question codes
    const sectionCodes = new Set(section.questions.map((q) => q.code));
    const sectionResponses: ResponseMap = {};
    for (const [code, resp] of Object.entries(allResponses)) {
      if (sectionCodes.has(code)) {
        sectionResponses[code] = resp;
      }
    }
    return computeSectionScore(section, sectionResponses);
  });

  const overallStatus = computeOverallStatus(sectionResults);
  const criticalFlags = generateCriticalFlags(sectionResults);

  const scored = sectionResults.filter((r) => r.colorStatus !== 'NOT_SCORED');

  return {
    sectionResults,
    overallStatus,
    criticalFlags,
    scoredSectionCount: scored.length,
    redCount: scored.filter((r) => r.colorStatus === 'RED').length,
    yellowCount: scored.filter((r) => r.colorStatus === 'YELLOW').length,
    greenCount: scored.filter(
      (r) => r.colorStatus === 'LIGHT_GREEN' || r.colorStatus === 'DARK_GREEN',
    ).length,
  };
}
