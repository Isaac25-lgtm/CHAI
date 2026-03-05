import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SkeletonProps {
  className?: string;
}

// ─── Table Skeleton ──────────────────────────────────────────────────────────

interface TableSkeletonProps extends SkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-[#E2E8F0]', className)}>
      {/* Header */}
      <div className="flex gap-4 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 max-w-[120px]" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 border-b border-[#E2E8F0] px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={cn(
                'h-4 flex-1',
                colIdx === 0 ? 'max-w-[160px]' : 'max-w-[100px]'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card Skeleton ───────────────────────────────────────────────────────

export function KPICardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="size-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Chart Skeleton ──────────────────────────────────────────────────────────

export function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] items-end gap-2">
          {[65, 45, 80, 55, 70, 40, 90, 60].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
