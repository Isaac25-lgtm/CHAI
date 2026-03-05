/**
 * Scoring module public API
 */

export {
  computeSectionScore,
  computeOverallStatus,
  generateCriticalFlags,
  computeFullAssessment,
} from './engine';

export type {
  QuestionResponse,
  ResponseMap,
  SectionScoreResult,
} from './engine';
