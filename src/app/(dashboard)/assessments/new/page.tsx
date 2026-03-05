'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitId = searchParams.get('visitId');

  const [error, setError] = useState<string | null>(null);
  const creating = useRef(false);

  useEffect(() => {
    if (!visitId) {
      setError('No visit ID provided. Please start an assessment from the Visits page.');
      return;
    }

    if (creating.current) return;
    creating.current = true;

    async function createAssessment() {
      try {
        const res = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitId }),
        });

        const data = await res.json();

        if (res.status === 409 && data.assessmentId) {
          // Assessment already exists for this visit — redirect to it
          router.replace(`/assessments/${data.assessmentId}`);
          return;
        }

        if (!res.ok) {
          setError(data.error || 'Failed to create assessment');
          return;
        }

        // Redirect to the newly created assessment
        router.replace(`/assessments/${data.id}`);
      } catch {
        setError('Failed to create assessment. Please try again.');
      }
    }

    createAssessment();
  }, [visitId, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 size-12 text-red-400" />
        <h2 className="text-lg font-semibold text-[#1E293B]">
          Could not create assessment
        </h2>
        <p className="mt-1 max-w-sm text-center text-sm text-[#64748B]">
          {error}
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

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="mb-4 size-10 animate-spin text-[#0F4C81]" />
      <p className="text-sm text-[#64748B]">Creating assessment...</p>
    </div>
  );
}
