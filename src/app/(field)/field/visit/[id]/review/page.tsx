'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  ClipboardList,
  CreditCard,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface DomainScore {
  sectionId: string;
  percentage: number;
  colorStatus: string;
  section: { title: string; sectionNumber: number };
}

interface Assessment {
  id: string;
  status: string;
  completionPct: number;
  domainScores: DomainScore[];
}

interface VisitReview {
  id: string;
  visitNumber: string;
  status: string;
  visitDate: string;
  facility: {
    name: string;
    level: string;
    district: { name: string; region: { name: string } };
  };
  participants: { id: string; fullName: string }[];
  assessments: Assessment[];
  actionPlans: { id: string; actionItem: string; priority: string; status: string }[];
  visitSummary: {
    overallStatus: string;
    redCount: number;
    yellowCount: number;
    lightGreenCount: number;
    darkGreenCount: number;
    totalScored: number;
    completionPct: number;
  } | null;
}

const COLOR_MAP: Record<string, { bg: string; text: string; label: string }> = {
  RED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Red' },
  YELLOW: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Yellow' },
  LIGHT_GREEN: { bg: 'bg-lime-100', text: 'text-lime-700', label: 'Light Green' },
  DARK_GREEN: { bg: 'bg-green-100', text: 'text-green-700', label: 'Dark Green' },
};

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data: visit, isLoading } = useQuery<VisitReview>({
    queryKey: ['visit-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/visits/${id}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const submitVisit = useMutation({
    mutationFn: async () => {
      setSubmitting(true);
      const res = await fetch(`/api/visits/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit visit');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['field-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['field-submitted'] });
      router.push(`/field/visit/${id}/done`);
    },
    onError: (err: Error) => {
      setSubmitting(false);
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-slate-500">Visit not found</p>
      </div>
    );
  }

  const assessment = visit.assessments?.[0];
  const participantCount = visit.participants?.length ?? 0;
  const isAlreadySubmitted = visit.status === 'SUBMITTED';
  const assessmentComplete = assessment?.status === 'SUBMITTED';
  const hasParticipants = participantCount > 0;

  // Identify missing items
  const missing: string[] = [];
  if (!hasParticipants) missing.push('No participants added');
  if (!assessment) missing.push('Assessment not started');
  else if (!assessmentComplete) missing.push('Assessment not submitted');

  const canSubmit = hasParticipants && assessmentComplete && !isAlreadySubmitted;

  // Domain scores sorted by section number
  const domainScores = (assessment?.domainScores ?? [])
    .slice()
    .sort((a, b) => a.section.sectionNumber - b.section.sectionNumber);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/field/visit/${id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Review & Submit</h1>
          <p className="text-xs text-slate-500">Step 6 of 6 · {visit.facility?.name}</p>
        </div>
      </div>

      {/* Visit info */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">{visit.facility.name}</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {visit.facility.district.name}, {visit.facility.district.region.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {new Date(visit.visitDate).toLocaleDateString('en-UG', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {visit.visitNumber && ` · ${visit.visitNumber}`}
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Completion Checklist</h3>
        <div className="space-y-1.5">
          <ChecklistItem
            icon={Users}
            label="Participants"
            detail={`${participantCount} added`}
            done={hasParticipants}
          />
          <ChecklistItem
            icon={ClipboardList}
            label="Assessment"
            detail={
              !assessment
                ? 'Not started'
                : assessmentComplete
                  ? `Submitted · ${assessment.completionPct}%`
                  : `In progress · ${assessment.completionPct}%`
            }
            done={assessmentComplete}
          />
          <ChecklistItem
            icon={CreditCard}
            label="Payment Details"
            detail="Optional"
            done={true}
            optional
          />
        </div>
      </div>

      {/* Missing items warning */}
      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800">Missing required items</p>
              <ul className="mt-1 space-y-0.5">
                {missing.map((m) => (
                  <li key={m} className="text-xs text-amber-700">· {m}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Domain scores */}
      {domainScores.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Domain Scores</h3>
          <div className="space-y-1">
            {domainScores.map((d) => {
              const color = COLOR_MAP[d.colorStatus] ?? COLOR_MAP.YELLOW;
              return (
                <div
                  key={d.sectionId}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="text-xs text-slate-700 truncate pr-2">
                    {d.section.sectionNumber}. {d.section.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-slate-600">
                      {Math.round(d.percentage)}%
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${color.bg} ${color.text}`}
                    >
                      {color.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overall status */}
      {visit.visitSummary && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Overall Summary
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-lg font-bold text-red-600">{visit.visitSummary.redCount}</p>
              <p className="text-[10px] text-red-500">Red</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-2">
              <p className="text-lg font-bold text-yellow-600">{visit.visitSummary.yellowCount}</p>
              <p className="text-[10px] text-yellow-500">Yellow</p>
            </div>
            <div className="rounded-lg bg-lime-50 p-2">
              <p className="text-lg font-bold text-lime-600">{visit.visitSummary.lightGreenCount}</p>
              <p className="text-[10px] text-lime-500">Lt Green</p>
            </div>
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-lg font-bold text-green-600">{visit.visitSummary.darkGreenCount}</p>
              <p className="text-[10px] text-green-500">Dk Green</p>
            </div>
          </div>
        </div>
      )}

      {/* Already submitted */}
      {isAlreadySubmitted && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
          <CheckCircle2 className="mx-auto size-5 text-green-500" />
          <p className="mt-1 text-sm font-medium text-green-700">Visit already submitted</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => router.push(`/field/visit/${id}`)}
          className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          onClick={() => submitVisit.mutate()}
          disabled={!canSubmit || submitting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0F4C81] py-2.5 text-sm font-semibold text-white hover:bg-[#0D3F6B] disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Send className="size-4" />
              Submit Visit
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ChecklistItem({
  icon: Icon,
  label,
  detail,
  done,
  optional,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
  done: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          done ? 'bg-green-100' : optional ? 'bg-slate-100' : 'bg-amber-100'
        }`}
      >
        {done ? (
          <CheckCircle2 className="size-3.5 text-green-600" />
        ) : (
          <Icon className={`size-3.5 ${optional ? 'text-slate-400' : 'text-amber-500'}`} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
