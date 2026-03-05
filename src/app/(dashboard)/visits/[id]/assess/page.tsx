'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Start/Continue Assessment page
//
// Checks if an assessment already exists for the visit:
//   - If yes, redirect to the existing assessment
//   - If no, create one via POST /api/assessments and redirect
// ---------------------------------------------------------------------------

export default function StartAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: visitId } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function initAssessment() {
      try {
        // 1. Check if there's an existing assessment for this visit
        const listRes = await fetch(
          `/api/assessments?visitId=${visitId}&pageSize=1`,
        );
        if (!listRes.ok) {
          throw new Error('Failed to check for existing assessments');
        }

        const listData = await listRes.json();

        if (cancelled) return;

        if (listData.data && listData.data.length > 0) {
          // Assessment exists, redirect to it
          const existingId = listData.data[0].id;
          router.replace(`/assessments/${existingId}`);
          return;
        }

        // 2. No existing assessment, create a new one
        const createRes = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitId }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          // If 409 (already exists), extract the assessment ID and redirect
          if (createRes.status === 409 && err.assessmentId) {
            router.replace(`/assessments/${err.assessmentId}`);
            return;
          }
          throw new Error(err.error || 'Failed to create assessment');
        }

        const created = await createRes.json();

        if (cancelled) return;

        // Redirect to the new assessment
        router.replace(`/assessments/${created.id}`);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
          setIsProcessing(false);
        }
      }
    }

    initAssessment();

    return () => {
      cancelled = true;
    };
  }, [visitId, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 size-12 text-red-400" />
        <h2 className="text-lg font-semibold text-[#1E293B]">
          Unable to Start Assessment
        </h2>
        <p className="mt-1 max-w-sm text-center text-sm text-[#64748B]">
          {error}
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/visits/${visitId}`)}
          >
            Back to Visit
          </Button>
          <Button
            onClick={() => {
              setError(null);
              setIsProcessing(true);
              router.refresh();
            }}
            className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="mb-4 size-10 animate-spin text-[#0F4C81]" />
      <h2 className="text-lg font-semibold text-[#1E293B]">
        {isProcessing ? 'Preparing Assessment...' : 'Redirecting...'}
      </h2>
      <p className="mt-1 text-sm text-[#64748B]">
        Setting up your assessment form. This will take a moment.
      </p>
    </div>
  );
}
