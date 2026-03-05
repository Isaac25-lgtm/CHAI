'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Save,
  Send,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SectionNav, type SectionNavItem } from '@/components/assessment/section-nav';
import { SectionForm, type ResponseState } from '@/components/assessment/section-form';
import { AssessmentSummary } from '@/components/assessment/assessment-summary';
import { ASSESSMENT_SECTION_DEFS } from '@/config/assessment-sections';
import type { QuestionValue } from '@/components/assessment/question-renderer';
import { isQuestionVisible } from '@/config/assessment-sections';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssessmentData {
  id: string;
  visitId: string;
  status: string;
  completionPct: number;
  startedAt: string;
  submittedAt: string | null;
  notes: string | null;
  visit: {
    id: string;
    visitNumber: string;
    visitDate: string;
    facility: {
      name: string;
      district: {
        name: string;
        region: { name: string };
      };
    };
  };
  submittedBy: { id: string; name: string; email: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseMap: Record<string, any>;
  domainScores: {
    sectionId: string;
    rawScore: number | null;
    maxScore: number | null;
    percentage: number | null;
    colorStatus: string;
    criticalFlags: string | null;
    details: string | null;
    section: {
      sectionNumber: number;
      title: string;
      scoringParadigm: string;
    };
  }[];
}

interface SubmitResult {
  overallStatus: string;
  sectionResults: {
    sectionNumber: number;
    title: string;
    rawScore: number | null;
    maxScore: number | null;
    percentage: number | null;
    colorStatus: string;
    criticalFlags: string[];
  }[];
  summary: {
    overallStatus: string;
    redCount: number;
    yellowCount: number;
    greenCount: number;
    scoredSectionCount: number;
    criticalFlags: string[];
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssessmentFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentSectionNum, setCurrentSectionNum] = useState(1);
  const [responses, setResponses] = useState<ResponseState>({});
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch assessment
  // -------------------------------------------------------------------------

  const {
    data: assessment,
    isLoading,
    isError,
  } = useQuery<AssessmentData>({
    queryKey: ['assessment', id],
    queryFn: async () => {
      const res = await fetch(`/api/assessments/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Assessment not found');
        throw new Error('Failed to fetch assessment');
      }
      return res.json();
    },
  });

  // Populate responses from fetched data
  useEffect(() => {
    if (assessment && !hasLoadedInitial) {
      const initialResponses: ResponseState = {};
      if (assessment.responseMap) {
        for (const [code, r] of Object.entries(assessment.responseMap)) {
          initialResponses[code] = {
            value: r.value ?? null,
            numericValue: r.numericValue ?? null,
            evidenceNotes: r.evidenceNotes ?? null,
            sampledData: r.sampledData ?? null,
          };
        }
      }
      setResponses(initialResponses);
      setHasLoadedInitial(true);

      // If already submitted, build submitResult from domainScores
      if (assessment.status === 'SUBMITTED' || assessment.status === 'REVIEWED') {
        const sectionResults = assessment.domainScores.map((ds) => ({
          sectionNumber: ds.section.sectionNumber,
          title: ds.section.title,
          rawScore: ds.rawScore,
          maxScore: ds.maxScore,
          percentage: ds.percentage,
          colorStatus: ds.colorStatus,
          criticalFlags: ds.criticalFlags ? JSON.parse(ds.criticalFlags) : [],
        }));

        const redCount = sectionResults.filter((r) => r.colorStatus === 'RED').length;
        const yellowCount = sectionResults.filter((r) => r.colorStatus === 'YELLOW').length;
        const greenCount = sectionResults.filter(
          (r) => r.colorStatus === 'LIGHT_GREEN' || r.colorStatus === 'DARK_GREEN',
        ).length;
        const scored = sectionResults.filter((r) => r.colorStatus !== 'NOT_SCORED');

        const allFlags: string[] = [];
        for (const r of sectionResults) {
          allFlags.push(...r.criticalFlags);
        }

        const overall =
          redCount > 0
            ? 'RED'
            : yellowCount > 0
              ? 'YELLOW'
              : greenCount > 0
                ? 'LIGHT_GREEN'
                : 'NOT_SCORED';

        setSubmitResult({
          overallStatus: overall,
          sectionResults,
          summary: {
            overallStatus: overall,
            redCount,
            yellowCount,
            greenCount,
            scoredSectionCount: scored.length,
            criticalFlags: allFlags,
          },
        });
      }
    }
  }, [assessment, hasLoadedInitial]);

  // -------------------------------------------------------------------------
  // Save mutation (auto-save + manual save)
  // -------------------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: async (responsesToSave: ResponseState) => {
      // Build the payload: only responses for the current section
      const allEntries = Object.entries(responsesToSave)
        .filter(([, v]) => v.value !== null || v.numericValue !== null || v.sampledData !== null)
        .map(([code, v]) => ({
          questionCode: code,
          value: v.value,
          numericValue: v.numericValue,
          evidenceNotes: v.evidenceNotes,
          sampledData: v.sampledData,
        }));

      if (allEntries.length === 0) return;

      const res = await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: allEntries }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['assessment', id], (old: AssessmentData | undefined) =>
          old ? { ...old, completionPct: data.completionPct, status: data.status } : old,
        );
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to save', { description: error.message });
    },
  });

  // -------------------------------------------------------------------------
  // Submit mutation
  // -------------------------------------------------------------------------

  const submitMutation = useMutation({
    mutationFn: async () => {
      // First do a final save
      const allEntries = Object.entries(responses)
        .filter(([, v]) => v.value !== null || v.numericValue !== null || v.sampledData !== null)
        .map(([code, v]) => ({
          questionCode: code,
          value: v.value,
          numericValue: v.numericValue,
          evidenceNotes: v.evidenceNotes,
          sampledData: v.sampledData,
        }));

      if (allEntries.length > 0) {
        const saveRes = await fetch(`/api/assessments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: allEntries }),
        });
        if (!saveRes.ok) {
          const err = await saveRes.json();
          throw new Error(err.error || 'Failed to save before submit');
        }
      }

      // Then submit
      const res = await fetch(`/api/assessments/${id}/submit`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit');
      }
      return res.json() as Promise<SubmitResult>;
    },
    onSuccess: (data) => {
      toast.success('Assessment submitted successfully');
      setSubmitResult(data);
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
    },
    onError: (error: Error) => {
      toast.error('Failed to submit assessment', { description: error.message });
    },
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleResponseChange = useCallback(
    (questionCode: string, update: Partial<QuestionValue>) => {
      setResponses((prev) => ({
        ...prev,
        [questionCode]: {
          ...(prev[questionCode] ?? {
            value: null,
            numericValue: null,
            evidenceNotes: null,
            sampledData: null,
          }),
          ...update,
        },
      }));
    },
    [],
  );

  const handleAutoSave = useCallback(
    (responsesToSave: ResponseState) => {
      if (assessment?.status === 'SUBMITTED' || assessment?.status === 'REVIEWED') return;
      saveMutation.mutate(responsesToSave);
    },
    [assessment?.status, saveMutation],
  );

  const handleManualSave = useCallback(() => {
    setIsSaving(true);
    saveMutation.mutate(responses, {
      onSettled: () => {
        setIsSaving(false);
        toast.success('Progress saved');
      },
    });
  }, [responses, saveMutation]);

  const goToSection = useCallback((num: number) => {
    setCurrentSectionNum(num);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goNext = useCallback(() => {
    const idx = ASSESSMENT_SECTION_DEFS.findIndex((s) => s.number === currentSectionNum);
    if (idx < ASSESSMENT_SECTION_DEFS.length - 1) {
      goToSection(ASSESSMENT_SECTION_DEFS[idx + 1].number);
    }
  }, [currentSectionNum, goToSection]);

  const goPrev = useCallback(() => {
    const idx = ASSESSMENT_SECTION_DEFS.findIndex((s) => s.number === currentSectionNum);
    if (idx > 0) {
      goToSection(ASSESSMENT_SECTION_DEFS[idx - 1].number);
    }
  }, [currentSectionNum, goToSection]);

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------

  const currentSection = useMemo(
    () => ASSESSMENT_SECTION_DEFS.find((s) => s.number === currentSectionNum),
    [currentSectionNum],
  );

  const sectionNavItems: SectionNavItem[] = useMemo(() => {
    // Build value map for visibility
    const valueMap: Record<string, string | null> = {};
    for (const [code, qv] of Object.entries(responses)) {
      valueMap[code] = qv.value;
    }

    return ASSESSMENT_SECTION_DEFS.map((sec) => {
      const visibleQuestions = sec.questions.filter((q) =>
        isQuestionVisible(q, valueMap),
      );
      const answeredCount = visibleQuestions.filter((q) => {
        const r = responses[q.code];
        return r && (r.value !== null || r.numericValue !== null || r.sampledData !== null);
      }).length;

      let completionStatus: 'empty' | 'partial' | 'complete' = 'empty';
      if (answeredCount > 0 && answeredCount >= visibleQuestions.length) {
        completionStatus = 'complete';
      } else if (answeredCount > 0) {
        completionStatus = 'partial';
      }

      // Color status from domain scores
      const domainScore = assessment?.domainScores?.find(
        (ds) => ds.section.sectionNumber === sec.number,
      );

      return {
        number: sec.number,
        title: sec.title,
        completionStatus,
        colorStatus: domainScore?.colorStatus as SectionNavItem['colorStatus'],
        questionCount: visibleQuestions.length,
        answeredCount,
      };
    });
  }, [responses, assessment?.domainScores]);

  const currentSectionIdx = ASSESSMENT_SECTION_DEFS.findIndex(
    (s) => s.number === currentSectionNum,
  );
  const isFirstSection = currentSectionIdx === 0;
  const isLastSection = currentSectionIdx === ASSESSMENT_SECTION_DEFS.length - 1;
  const isEditable = assessment?.status === 'DRAFT' || assessment?.status === 'IN_PROGRESS';

  // Overall completion
  const totalAnswered = sectionNavItems.reduce((acc, s) => acc + s.answeredCount, 0);
  const totalQuestions = sectionNavItems.reduce((acc, s) => acc + s.questionCount, 0);
  const completionPct = totalQuestions > 0
    ? Math.round((totalAnswered / totalQuestions) * 100)
    : 0;

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex gap-6">
          <Skeleton className="hidden h-[500px] w-64 rounded-lg lg:block" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !assessment) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 size-12 text-red-400" />
        <h2 className="text-lg font-semibold text-[#1E293B]">Assessment not found</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          The assessment you are looking for does not exist or you do not have access.
        </p>
        <Button
          variant="outline"
          className="mt-4 gap-1.5"
          onClick={() => router.push('/visits')}
        >
          <ChevronLeft className="size-4" />
          Back to Visits
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Submitted view: show summary
  // -------------------------------------------------------------------------

  if (submitResult) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assessment Complete"
          description={`${assessment.visit.visitNumber} - ${assessment.visit.facility.name}`}
        >
          <Button
            variant="outline"
            onClick={() => router.push(`/visits/${assessment.visitId}`)}
            className="gap-1.5"
          >
            <ChevronLeft className="size-4" />
            Back to Visit
          </Button>
        </PageHeader>

        <AssessmentSummary
          overallStatus={submitResult.overallStatus}
          sectionResults={submitResult.sectionResults}
          summary={submitResult.summary}
          visitNumber={assessment.visit.visitNumber}
          facilityName={assessment.visit.facility.name}
          submittedAt={assessment.submittedAt ?? new Date().toISOString()}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Form view
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader title="Assessment Form">
        <Button
          variant="outline"
          onClick={() => router.push(`/visits/${assessment.visitId}`)}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Back to Visit</span>
        </Button>
      </PageHeader>

      {/* Visit info bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono font-bold text-[#0F4C81]">
              {assessment.visit.visitNumber}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
            <Building2 className="size-3.5" />
            {assessment.visit.facility.name}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
            <Calendar className="size-3.5" />
            {new Date(assessment.visit.visitDate).toLocaleDateString('en-UG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
          <Badge
            variant="outline"
            className={
              assessment.status === 'IN_PROGRESS'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
            }
          >
            {assessment.status === 'IN_PROGRESS' ? 'In Progress' : assessment.status}
          </Badge>
        </CardContent>
      </Card>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span>Overall Progress</span>
          <span className="font-medium">{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-2" />
      </div>

      {/* Section navigation: renders mobile top bar (lg:hidden) + desktop sidebar (hidden lg:block) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <SectionNav
          sections={sectionNavItems}
          currentSection={currentSectionNum}
          onSelect={goToSection}
          isSubmitted={!isEditable}
        />

        {/* Form content */}
        <div className="min-w-0 flex-1">
          {currentSection && (
            <SectionForm
              section={currentSection}
              responses={responses}
              onResponseChange={handleResponseChange}
              onAutoSave={handleAutoSave}
              disabled={!isEditable}
            />
          )}

          {/* Navigation buttons */}
          <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={isFirstSection}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={goNext}
                disabled={isLastSection}
                className="gap-1.5"
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              {isEditable && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleManualSave}
                    disabled={isSaving || saveMutation.isPending}
                    className="gap-1.5"
                  >
                    {isSaving || saveMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save Draft
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="gap-1.5 bg-[#0F4C81] hover:bg-[#0D3F6B]">
                        <Send className="size-4" />
                        Submit Assessment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will score all sections and finalize the assessment for{' '}
                          <strong>{assessment.visit.visitNumber}</strong>. You will not be able
                          to modify responses after submission.
                          <br />
                          <br />
                          Current progress: <strong>{completionPct}%</strong> complete
                          ({totalAnswered} of {totalQuestions} questions answered).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => submitMutation.mutate()}
                          className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
                          disabled={submitMutation.isPending}
                        >
                          {submitMutation.isPending ? (
                            <Loader2 className="mr-1.5 size-4 animate-spin" />
                          ) : (
                            <Send className="mr-1.5 size-4" />
                          )}
                          Submit
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
