'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronLeft } from 'lucide-react';

/**
 * Assessment page in the field wizard.
 *
 * This page checks if an assessment exists for the visit.
 * If not, it creates one. Then it redirects to the full assessment form
 * at /assessments/[assessmentId] (which already has the full section-by-section
 * form with autosave, branching, and progress tracking).
 *
 * The visit must first be submitted before an assessment can be created.
 * If the visit is still in DRAFT, we submit it first.
 */
export default function FieldAssessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: visitId } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Preparing assessment...');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Check visit status
        const visitRes = await fetch(`/api/visits/${visitId}`);
        if (!visitRes.ok) throw new Error('Could not load visit');
        const visit = await visitRes.json();
        if (cancelled) return;

        // 2. If DRAFT, submit it first (so assessment can be created)
        if (visit.status === 'DRAFT') {
          setStatus('Submitting visit...');
          const submitRes = await fetch(`/api/visits/${visitId}/submit`, {
            method: 'POST',
          });
          if (!submitRes.ok) {
            const err = await submitRes.json();
            throw new Error(err.error || err.details?.join(', ') || 'Could not submit visit');
          }
          if (cancelled) return;
        }

        // 3. Check for existing assessment
        setStatus('Checking assessment...');
        const listRes = await fetch(`/api/assessments?visitId=${visitId}&pageSize=1`);
        if (!listRes.ok) throw new Error('Failed to check assessments');
        const listData = await listRes.json();
        if (cancelled) return;

        if (listData.data?.length > 0) {
          router.replace(`/assessments/${listData.data[0].id}?from=field&visitId=${visitId}`);
          return;
        }

        // 4. Create assessment
        setStatus('Creating assessment...');
        const createRes = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitId }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          if (createRes.status === 409 && err.assessmentId) {
            router.replace(`/assessments/${err.assessmentId}?from=field&visitId=${visitId}`);
            return;
          }
          throw new Error(err.error || 'Failed to create assessment');
        }

        const created = await createRes.json();
        if (cancelled) return;
        router.replace(`/assessments/${created.id}?from=field&visitId=${visitId}`);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [visitId, router]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/field/visit/${visitId}`)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Assessment</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setStatus('Retrying...');
              router.refresh();
            }}
            className="mt-3 rounded-lg bg-[#0F4C81] px-4 py-2 text-sm font-medium text-white hover:bg-[#0D3F6B]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="mb-4 size-8 animate-spin text-[#0F4C81]" />
      <p className="text-sm font-medium text-slate-700">{status}</p>
    </div>
  );
}
