import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ChartContainer({
  title,
  description,
  children,
  className,
  action,
}: ChartContainerProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div>
          <CardTitle className="text-base font-semibold text-[#1E293B]">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="mt-1 text-[#64748B]">
              {description}
            </CardDescription>
          )}
        </div>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>
        <div className="min-h-[200px] w-full">{children}</div>
      </CardContent>
    </Card>
  );
}
