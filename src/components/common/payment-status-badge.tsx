'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type PaymentBadgeStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'APPROVED'
  | 'PAID'
  | 'RECONCILED'
  | 'REJECTED';

interface PaymentStatusBadgeProps {
  status: PaymentBadgeStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<
  PaymentBadgeStatus,
  { label: string; bg: string; text: string }
> = {
  DRAFT: {
    label: 'Draft',
    bg: 'bg-gray-100 border-gray-200',
    text: 'text-gray-600',
  },
  SUBMITTED: {
    label: 'Submitted',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
  },
  VERIFIED: {
    label: 'Verified',
    bg: 'bg-cyan-50 border-cyan-200',
    text: 'text-cyan-700',
  },
  APPROVED: {
    label: 'Approved',
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-700',
  },
  PAID: {
    label: 'Paid',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
  },
  RECONCILED: {
    label: 'Reconciled',
    bg: 'bg-slate-100 border-slate-300',
    text: 'text-slate-700',
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
  },
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
};

export function PaymentStatusBadge({
  status,
  size = 'md',
  className,
}: PaymentStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.DRAFT;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        config.bg,
        config.text,
        sizeClasses[size],
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
