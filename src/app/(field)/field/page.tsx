'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, FileText, CheckCircle2, Loader2 } from 'lucide-react';

interface VisitSummary {
  id: string;
  visitNumber: string;
  facilityName: string;
  visitDate: string;
  status: string;
  assessmentStatus: string | null;
  assessmentId: string | null;
  participantCount: number;
}

export default function FieldHomePage() {
  const router = useRouter();

  const { data: drafts, isLoading: draftsLoading } = useQuery<{ data: VisitSummary[] }>({
    queryKey: ['field-drafts'],
    queryFn: async () => {
      const res = await fetch('/api/visits?status=DRAFT&pageSize=10');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: submitted, isLoading: submittedLoading } = useQuery<{ data: VisitSummary[] }>({
    queryKey: ['field-submitted'],
    queryFn: async () => {
      const res = await fetch('/api/visits?status=SUBMITTED&pageSize=10');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Field Visits</h1>
        <p className="mt-1 text-sm text-slate-500">Conduct facility assessments</p>
      </div>

      {/* Start New Visit - Primary action */}
      <button
        onClick={() => router.push('/field/visit/new')}
        className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-[#0F4C81]/30 bg-[#0F4C81]/5 p-5 text-left transition-all hover:border-[#0F4C81]/50 hover:bg-[#0F4C81]/10 active:scale-[0.98]"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F4C81]">
          <Plus className="size-6 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Start New Visit</p>
          <p className="text-sm text-slate-500">Pick a facility and begin</p>
        </div>
      </button>

      {/* Continue Draft */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileText className="size-4 text-amber-500" />
          Continue Draft
          {drafts?.data?.length ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {drafts.data.length}
            </span>
          ) : null}
        </h2>

        {draftsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        ) : drafts?.data?.length ? (
          <div className="space-y-2">
            {drafts.data.map((visit) => (
              <button
                key={visit.id}
                onClick={() => router.push(`/field/visit/${visit.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {visit.facilityName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(visit.visitDate).toLocaleDateString('en-UG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' · '}
                    {visit.participantCount} participant{visit.participantCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  Draft
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
            No drafts
          </p>
        )}
      </div>

      {/* Submitted Visits */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CheckCircle2 className="size-4 text-green-500" />
          Submitted Visits
        </h2>

        {submittedLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        ) : submitted?.data?.length ? (
          <div className="space-y-2">
            {submitted.data.slice(0, 5).map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {visit.facilityName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {visit.visitNumber}
                    {' · '}
                    {new Date(visit.visitDate).toLocaleDateString('en-UG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  Submitted
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
            No submitted visits yet
          </p>
        )}
      </div>
    </div>
  );
}
