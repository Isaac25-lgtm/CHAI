'use client';

import { cn } from '@/lib/utils';
import { StatusBadge, type ColorStatus } from '@/components/common/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Flag,
  Printer,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectionResult {
  sectionNumber: number;
  title?: string;
  rawScore: number | null;
  maxScore: number | null;
  percentage: number | null;
  colorStatus: ColorStatus | string;
  criticalFlags: string[];
}

interface AssessmentSummaryProps {
  overallStatus: ColorStatus | string;
  sectionResults: SectionResult[];
  summary: {
    redCount: number;
    yellowCount: number;
    greenCount: number;
    scoredSectionCount: number;
    criticalFlags: string[];
  };
  visitNumber?: string;
  facilityName?: string;
  submittedAt?: string;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const statusColors: Record<string, { bg: string; text: string; ring: string }> = {
  RED: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  YELLOW: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  LIGHT_GREEN: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  DARK_GREEN: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-200' },
  NOT_SCORED: { bg: 'bg-gray-50', text: 'text-gray-500', ring: 'ring-gray-200' },
};

const statusLabels: Record<string, string> = {
  RED: 'Red - Critical',
  YELLOW: 'Yellow - Needs Improvement',
  LIGHT_GREEN: 'Light Green - Good',
  DARK_GREEN: 'Dark Green - Excellent',
  NOT_SCORED: 'Not Scored',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssessmentSummary({
  overallStatus,
  sectionResults,
  summary,
  visitNumber,
  facilityName,
  submittedAt,
}: AssessmentSummaryProps) {
  const overall = statusColors[overallStatus] ?? statusColors.NOT_SCORED;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print header (visible only in print) */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">CHAI PMTCT Assessment Report</h1>
        {visitNumber && <p className="text-sm">Visit: {visitNumber}</p>}
        {facilityName && <p className="text-sm">Facility: {facilityName}</p>}
        {submittedAt && (
          <p className="text-sm">
            Submitted: {new Date(submittedAt).toLocaleDateString('en-UG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Print button (hidden in print) */}
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={handlePrint} className="gap-1.5">
          <Printer className="size-4" />
          Print Report
        </Button>
      </div>

      {/* Overall status card */}
      <Card className={cn('overflow-hidden border-2', overall.ring)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Overall Assessment Status
              </p>
              <h2 className={cn('mt-1 text-2xl font-bold', overall.text)}>
                {statusLabels[overallStatus] ?? 'Unknown'}
              </h2>
              {visitNumber && (
                <p className="mt-1 text-sm text-[#94A3B8]">
                  {visitNumber} {facilityName ? ` - ${facilityName}` : ''}
                </p>
              )}
            </div>
            <StatusBadge status={overallStatus as ColorStatus} size="lg" showDot />
          </div>
        </CardContent>
      </Card>

      {/* Summary counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center p-4">
            <TrendingDown className="mb-1 size-5 text-red-500" />
            <p className="text-2xl font-bold text-red-700">{summary.redCount}</p>
            <p className="text-xs font-medium text-red-600">Red</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col items-center p-4">
            <AlertTriangle className="mb-1 size-5 text-amber-500" />
            <p className="text-2xl font-bold text-amber-700">{summary.yellowCount}</p>
            <p className="text-xs font-medium text-amber-600">Yellow</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex flex-col items-center p-4">
            <CheckCircle2 className="mb-1 size-5 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-700">{summary.greenCount}</p>
            <p className="text-xs font-medium text-emerald-600">Green</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex flex-col items-center p-4">
            <BarChart3 className="mb-1 size-5 text-blue-500" />
            <p className="text-2xl font-bold text-blue-700">{summary.scoredSectionCount}</p>
            <p className="text-xs font-medium text-blue-600">Scored</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="flex flex-col items-center p-4">
            <Flag className="mb-1 size-5 text-gray-500" />
            <p className="text-2xl font-bold text-[#1E293B]">{summary.criticalFlags.length}</p>
            <p className="text-xs font-medium text-[#64748B]">Flags</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical flags */}
      {summary.criticalFlags.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-700">
              <AlertTriangle className="size-4" />
              Critical Flags ({summary.criticalFlags.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {summary.criticalFlags.map((flag, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                    {idx + 1}
                  </span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Domain breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">
            Domain Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {sectionResults.map((result) => {
              const colors = statusColors[result.colorStatus] ?? statusColors.NOT_SCORED;
              return (
                <div
                  key={result.sectionNumber}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                    colors.ring,
                    colors.bg,
                  )}
                >
                  {/* Section number */}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-bold text-[#1E293B] shadow-sm">
                    {result.sectionNumber}
                  </span>

                  {/* Title */}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-[#1E293B]">
                      {result.title ?? `Section ${result.sectionNumber}`}
                    </p>
                    {result.percentage !== null && (
                      <p className="text-xs text-[#64748B]">
                        {result.rawScore ?? 0} / {result.maxScore ?? '-'} ({result.percentage}%)
                      </p>
                    )}
                  </div>

                  {/* Score bar */}
                  {result.percentage !== null && (
                    <div className="hidden w-24 sm:block">
                      <div className="h-2 overflow-hidden rounded-full bg-white/80">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            result.colorStatus === 'RED' && 'bg-red-500',
                            result.colorStatus === 'YELLOW' && 'bg-amber-500',
                            result.colorStatus === 'LIGHT_GREEN' && 'bg-emerald-400',
                            result.colorStatus === 'DARK_GREEN' && 'bg-green-600',
                          )}
                          style={{ width: `${Math.min(result.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status badge */}
                  <StatusBadge
                    status={result.colorStatus as ColorStatus}
                    size="sm"
                  />

                  {/* Flags count */}
                  {result.criticalFlags.length > 0 && (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-[10px] text-red-600"
                    >
                      {result.criticalFlags.length} flag{result.criticalFlags.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
