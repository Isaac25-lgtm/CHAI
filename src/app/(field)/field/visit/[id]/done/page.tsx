'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Home, Loader2 } from 'lucide-react';

interface VisitDone {
  id: string;
  visitNumber: string;
  visitDate: string;
  facility: {
    name: string;
    district: { name: string };
  };
  participants: { id: string }[];
  assessments: {
    id: string;
    status: string;
    completionPct: number;
    domainScores: {
      sectionId: string;
      colorStatus: string;
    }[];
  }[];
  actionPlans: { id: string }[];
  visitSummary: {
    overallStatus: string;
    redCount: number;
    yellowCount: number;
    lightGreenCount: number;
    darkGreenCount: number;
    totalScored: number;
  } | null;
}

export default function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: visit, isLoading } = useQuery<VisitDone>({
    queryKey: ['visit-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/visits/${id}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
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
  const scoredSections = assessment?.domainScores?.length ?? 0;
  const participantCount = visit.participants?.length ?? 0;
  const actionCount = visit.actionPlans?.length ?? 0;

  return (
    <div className="flex flex-col items-center pt-8 space-y-6">
      {/* Success icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="size-10 text-green-500" />
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">Visit Submitted</h1>
        <p className="mt-1 text-sm text-slate-500">
          {visit.facility.name}
        </p>
        <p className="text-xs text-slate-400">
          {visit.facility.district.name} ·{' '}
          {new Date(visit.visitDate).toLocaleDateString('en-UG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
        {visit.visitNumber && (
          <p className="mt-1 text-xs font-medium text-slate-500">
            {visit.visitNumber}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="w-full max-w-xs space-y-2">
        <StatRow label="Participants" value={`${participantCount}`} />
        <StatRow label="Sections scored" value={`${scoredSections}`} />
        <StatRow label="Actions flagged" value={`${actionCount}`} />
        {visit.visitSummary && (
          <StatRow
            label="Overall status"
            value={formatStatus(visit.visitSummary.overallStatus)}
          />
        )}
      </div>

      {/* Color summary */}
      {visit.visitSummary && (
        <div className="grid w-full max-w-xs grid-cols-4 gap-2 text-center">
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
      )}

      {/* Back to home */}
      <button
        onClick={() => router.push('/field')}
        className="flex w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-[#0F4C81] py-3 text-sm font-semibold text-white hover:bg-[#0D3F6B]"
      >
        <Home className="size-4" />
        Back to Home
      </button>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
