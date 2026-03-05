'use client';

import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  href?: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  href,
  className,
}: KPICardProps) {
  const content = (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        href && 'cursor-pointer hover:shadow-md hover:border-[#2E86C1]/30',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#64748B]">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-[#1E293B]">
              {value}
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                {change >= 0 ? (
                  <ArrowUpRight className="size-4 text-[#16A34A]" />
                ) : (
                  <ArrowDownRight className="size-4 text-[#DC2626]" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    change >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                  )}
                >
                  {change > 0 && '+'}
                  {change}%
                </span>
                {changeLabel && (
                  <span className="text-xs text-[#64748B]">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#0F4C81]/10 text-[#0F4C81]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
