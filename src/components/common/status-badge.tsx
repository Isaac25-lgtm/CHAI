'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type ColorStatus = 'RED' | 'YELLOW' | 'LIGHT_GREEN' | 'DARK_GREEN' | 'NOT_SCORED';

interface StatusBadgeProps {
  status: ColorStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<
  ColorStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  RED: {
    label: 'Red',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  YELLOW: {
    label: 'Yellow',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  LIGHT_GREEN: {
    label: 'Light Green',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
  },
  DARK_GREEN: {
    label: 'Dark Green',
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-600',
  },
  NOT_SCORED: {
    label: 'Not Scored',
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-500',
    dot: 'bg-gray-400',
  },
};

const sizeConfig: Record<string, { badge: string; dot: string }> = {
  sm: { badge: 'px-1.5 py-0.5 text-[10px]', dot: 'size-1.5' },
  md: { badge: 'px-2.5 py-0.5 text-xs', dot: 'size-2' },
  lg: { badge: 'px-3 py-1 text-sm', dot: 'size-2.5' },
};

export function StatusBadge({
  status,
  size = 'md',
  showDot = false,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizing = sizeConfig[size];

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        config.bg,
        config.text,
        sizing.badge,
        className
      )}
    >
      {showDot && (
        <span
          className={cn('shrink-0 rounded-full', config.dot, sizing.dot)}
          aria-hidden="true"
        />
      )}
      {config.label}
    </Badge>
  );
}
