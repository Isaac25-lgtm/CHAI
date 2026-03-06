'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  ClipboardList,
  CreditCard,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface VisitDetail {
  id: string;
  visitNumber: string;
  status: string;
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
  }[];
}

export default function VisitHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: visit, isLoading } = useQuery<VisitDetail>({
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
        <Loader2 className="size-8 animate-spin text-slate-400" />
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
  const isSubmitted = visit.status === 'SUBMITTED';

  const steps = [
    {
      label: 'Add Participants',
      description: `${participantCount} added`,
      icon: Users,
      href: `/field/visit/${id}/participants`,
      done: participantCount > 0,
    },
    {
      label: 'Complete Assessment',
      description: assessment
        ? `${assessment.completionPct}% complete`
        : 'Not started',
      icon: ClipboardList,
      href: `/field/visit/${id}/assess`,
      done: assessment?.status === 'SUBMITTED',
    },
    {
      label: 'Payment Details',
      description: 'Capture mobile money info',
      icon: CreditCard,
      href: `/field/visit/${id}/payments`,
      done: false,
    },
    {
      label: 'Review & Submit',
      description: isSubmitted ? 'Submitted' : 'Final check',
      icon: CheckCircle2,
      href: `/field/visit/${id}/review`,
      done: isSubmitted,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/field')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">
            {visit.facility.name}
          </h1>
          <p className="text-xs text-slate-500">
            {visit.facility.district.name} ·{' '}
            {new Date(visit.visitDate).toLocaleDateString('en-UG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <button
              key={idx}
              onClick={() => router.push(step.href)}
              className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.99]"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  step.done
                    ? 'bg-green-100 text-green-600'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-slate-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
