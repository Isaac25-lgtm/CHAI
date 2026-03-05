'use client';

import {
  FileSpreadsheet,
  FileText,
  FileBarChart2,
  Users,
  CreditCard,
  ShieldCheck,
  ClipboardList,
  Database,
  BarChart3,
  ScrollText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { useCurrentUser } from '@/hooks/use-session';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Export tile definitions
// ---------------------------------------------------------------------------

interface ExportTile {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  formats: string[];
  roles?: string[]; // if specified, only these roles see the tile
}

const EXPORT_TILES: ExportTile[] = [
  {
    id: 'raw-assessment',
    title: 'Raw Assessment Data',
    description:
      'Complete raw responses from all facility assessments with question codes and values.',
    icon: <Database className="size-6" />,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'analyzed-assessment',
    title: 'Analyzed Assessment Data',
    description:
      'Scored assessment data with domain scores, color statuses, and computed metrics.',
    icon: <BarChart3 className="size-6" />,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'facility-summary',
    title: 'Facility Summary Report',
    description:
      'Per-facility performance summary with overall status, domain breakdown, and trends.',
    icon: <FileBarChart2 className="size-6" />,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'district-summary',
    title: 'District Summary Report',
    description:
      'Aggregated district-level performance, facility counts, and key findings.',
    icon: <FileText className="size-6" />,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'national-summary',
    title: 'National Summary Report',
    description:
      'National overview across all districts and regions with comparative metrics.',
    icon: <FileSpreadsheet className="size-6" />,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'action-plan',
    title: 'Action Plan Export',
    description:
      'All action plans with status, priority, assigned owners, and due dates.',
    icon: <ClipboardList className="size-6" />,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'names-registry',
    title: 'Names Registry Export',
    description:
      'Participant names registry with verification and approval statuses.',
    icon: <Users className="size-6" />,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'payment',
    title: 'Payment Export',
    description:
      'Payment records with amounts, mobile money details, and reconciliation status.',
    icon: <CreditCard className="size-6" />,
    formats: ['Excel', 'CSV'],
    roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'FINANCE_OFFICER'],
  },
  {
    id: 'data-quality',
    title: 'Data Quality Report',
    description:
      'Data quality flags, validation issues, and resolution statuses.',
    icon: <ShieldCheck className="size-6" />,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'audit-log',
    title: 'Audit Log Export',
    description:
      'System audit trail with user actions, timestamps, and entity changes.',
    icon: <ScrollText className="size-6" />,
    formats: ['Excel', 'CSV'],
    roles: ['SUPER_ADMIN', 'NATIONAL_ADMIN'],
  },
];

// ---------------------------------------------------------------------------
// Format badge colors
// ---------------------------------------------------------------------------

const FORMAT_STYLES: Record<string, string> = {
  Excel: 'border-green-200 bg-green-50 text-green-700',
  CSV: 'border-blue-200 bg-blue-50 text-blue-700',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DownloadsPage() {
  const { user } = useCurrentUser();

  const handleDownload = (tile: ExportTile, format: string) => {
    const fmt = format.toLowerCase();
    const url = `/api/exports/${tile.id}?format=${fmt}`;
    window.open(url, '_blank');
    toast.info(`Export generating...`, {
      description: `Preparing ${tile.title} in ${format} format.`,
      duration: 4000,
    });
  };

  // Filter tiles by role
  const visibleTiles = EXPORT_TILES.filter((tile) => {
    if (!tile.roles) return true;
    if (!user) return false;
    return tile.roles.includes(user.role);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Downloads & Reports"
        description="Export data and generate reports in various formats"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTiles.map((tile) => (
          <Card
            key={tile.id}
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#2E86C1]/30"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#0F4C81]/10 text-[#0F4C81]">
                  {tile.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[#1E293B]">
                    {tile.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    {tile.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {tile.formats.map((fmt) => (
                    <Badge
                      key={fmt}
                      variant="outline"
                      className={FORMAT_STYLES[fmt] ?? 'text-[#64748B]'}
                    >
                      {fmt}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  {tile.formats.map((fmt) => (
                    <Button
                      key={fmt}
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => handleDownload(tile, fmt)}
                    >
                      <Download className="size-3" />
                      {fmt}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {visibleTiles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#E2E8F0] py-16 text-center">
          <FileSpreadsheet className="mb-3 size-12 text-[#64748B]/40" />
          <p className="text-sm text-[#64748B]">
            No export options available for your role.
          </p>
        </div>
      )}
    </div>
  );
}
