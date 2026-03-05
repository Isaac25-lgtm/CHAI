import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-16 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#F8FAFC] text-[#64748B]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#1E293B]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[#64748B]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
