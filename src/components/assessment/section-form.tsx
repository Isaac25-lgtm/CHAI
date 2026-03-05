'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { QuestionRenderer, type QuestionValue } from './question-renderer';
import type { SectionDef } from '@/config/assessment-sections';
import { isQuestionVisible } from '@/config/assessment-sections';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResponseState = Record<string, QuestionValue>;

interface SectionFormProps {
  section: SectionDef;
  responses: ResponseState;
  onResponseChange: (questionCode: string, update: Partial<QuestionValue>) => void;
  onAutoSave: (responses: ResponseState) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Scoring paradigm badge
// ---------------------------------------------------------------------------

const PARADIGM_LABELS: Record<string, { label: string; className: string }> = {
  MATURITY_LADDER: {
    label: 'Maturity Ladder',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  PERCENTAGE_BASED: {
    label: 'Percentage Based',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  COUNT_BASED: {
    label: 'Count Based',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  COMPOSITE: {
    label: 'Composite',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  DESCRIPTIVE: {
    label: 'Descriptive (Not Scored)',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectionForm({
  section,
  responses,
  onResponseChange,
  onAutoSave,
  disabled = false,
}: SectionFormProps) {
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChangesRef = useRef(false);

  // Build a flat value map for branch visibility checks
  const valueMap: Record<string, string | null> = {};
  for (const [code, qv] of Object.entries(responses)) {
    valueMap[code] = qv.value;
  }

  // Filter visible questions
  const visibleQuestions = section.questions.filter((q) =>
    isQuestionVisible(q, valueMap),
  );

  // Handle question change with debounced auto-save
  const handleChange = useCallback(
    (questionCode: string, update: Partial<QuestionValue>) => {
      onResponseChange(questionCode, update);
      pendingChangesRef.current = true;

      // Debounced auto-save (1.5 seconds after last change)
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        if (pendingChangesRef.current) {
          pendingChangesRef.current = false;
          onAutoSave(responses);
        }
      }, 1500);
    },
    [onResponseChange, onAutoSave, responses],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      // Flush pending changes on section change
      if (pendingChangesRef.current) {
        pendingChangesRef.current = false;
        onAutoSave(responses);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.number]);

  const paradigm = PARADIGM_LABELS[section.scoringParadigm] ?? PARADIGM_LABELS.DESCRIPTIVE;

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#0F4C81] text-sm font-bold text-white">
            {section.number}
          </span>
          <h2 className="text-lg font-bold text-[#1E293B] sm:text-xl">
            {section.title}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-[#64748B]">
          {section.description}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={paradigm.className}>
            {paradigm.label}
          </Badge>
          <span className="text-xs text-[#94A3B8]">
            {visibleQuestions.length} question{visibleQuestions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {visibleQuestions.map((question, idx) => {
          const current: QuestionValue = responses[question.code] ?? {
            value: null,
            numericValue: null,
            evidenceNotes: null,
            sampledData: null,
          };

          return (
            <QuestionRenderer
              key={question.code}
              question={question}
              currentValue={current}
              onChange={handleChange}
              disabled={disabled}
              index={idx + 1}
            />
          );
        })}
      </div>

      {visibleQuestions.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-6 py-10 text-center">
          <p className="text-sm text-[#94A3B8]">
            No questions to display for this section.
          </p>
        </div>
      )}
    </div>
  );
}
