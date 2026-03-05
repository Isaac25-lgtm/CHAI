'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Building2,
  FileText,
  FileClock,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ClipboardList,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { KPICard } from '@/components/common/kpi-card';
import { ChartContainer } from '@/components/common/chart-container';
import { KPICardSkeleton, ChartSkeleton } from '@/components/common/loading-skeleton';

// ---------------------------------------------------------------------------
// Chart color constants
// ---------------------------------------------------------------------------

const COLORS = {
  RED: '#DC2626',
  YELLOW: '#EAB308',
  LIGHT_GREEN: '#4ADE80',
  DARK_GREEN: '#16A34A',
  PRIMARY: '#0F4C81',
};

const PIE_COLORS = [COLORS.RED, COLORS.YELLOW, COLORS.LIGHT_GREEN, COLORS.DARK_GREEN];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewData {
  facilitiesAssessed: number;
  submissionsToday: number;
  draftsPending: number;
  totalRedFindings: number;
  totalYellowFindings: number;
  avgPerformance: number;
  openActions: number;
  overdueActions: number;
  submissionsByDistrict: { name: string; count: number }[];
  colorDistribution: {
    RED: number;
    YELLOW: number;
    LIGHT_GREEN: number;
    DARK_GREEN: number;
  };
  topProblemDomains: {
    sectionId: string;
    sectionTitle: string;
    sectionNumber: number;
    count: number;
  }[];
  trendData: { date: string; avgScore: number; submissions: number }[];
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 shadow-lg">
      <p className="mb-1.5 text-sm font-medium text-[#1E293B]">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function OverviewPage() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/overview');
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json();
    },
  });

  // Prepare pie chart data
  const pieData = data
    ? [
        { name: 'Red', value: data.colorDistribution.RED },
        { name: 'Yellow', value: data.colorDistribution.YELLOW },
        { name: 'Light Green', value: data.colorDistribution.LIGHT_GREEN },
        { name: 'Dark Green', value: data.colorDistribution.DARK_GREEN },
      ].filter((d) => d.value > 0)
    : [];

  // Prepare problem domains data (truncate long titles)
  const problemDomainData = data?.topProblemDomains.map((d) => ({
    name: d.sectionTitle.length > 30
      ? `S${d.sectionNumber}: ${d.sectionTitle.slice(0, 27)}...`
      : `S${d.sectionNumber}: ${d.sectionTitle}`,
    count: d.count,
  })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="National PMTCT mentorship program dashboard"
      />

      {/* Row 1: First 4 KPI cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Facilities Assessed"
            value={data?.facilitiesAssessed ?? 0}
            icon={<Building2 className="size-5" />}
            href="/facilities"
          />
          <KPICard
            title="Submissions Today"
            value={data?.submissionsToday ?? 0}
            icon={<FileText className="size-5" />}
            href="/live-submissions"
          />
          <KPICard
            title="RED Findings"
            value={data?.totalRedFindings ?? 0}
            icon={<AlertTriangle className="size-5" />}
          />
          <KPICard
            title="YELLOW Findings"
            value={data?.totalYellowFindings ?? 0}
            icon={<AlertCircle className="size-5" />}
          />
        </div>
      )}

      {/* Row 2: Second 4 KPI cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Avg Performance"
            value={`${data?.avgPerformance ?? 0}%`}
            icon={<TrendingUp className="size-5" />}
          />
          <KPICard
            title="Open Actions"
            value={data?.openActions ?? 0}
            icon={<ClipboardList className="size-5" />}
            href="/actions"
          />
          <KPICard
            title="Overdue Actions"
            value={data?.overdueActions ?? 0}
            icon={<Clock className="size-5" />}
            href="/actions"
          />
          <KPICard
            title="Drafts Pending"
            value={data?.draftsPending ?? 0}
            icon={<FileClock className="size-5" />}
            href="/visits"
          />
        </div>
      )}

      {/* Row 3: Two charts side by side */}
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submissions by District */}
          <ChartContainer
            title="Submissions by District"
            description="Total submitted visits per district"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={data?.submissionsByDistrict ?? []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Submissions"
                  fill={COLORS.PRIMARY}
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Color Distribution */}
          <ChartContainer
            title="Color Distribution"
            description="Overall assessment color status breakdown"
          >
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={({ name, percent }: any) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                      strokeWidth={0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    Number(value).toLocaleString(),
                    name,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12, color: '#64748B' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}

      {/* Row 4: Two charts side by side */}
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Problem Domains */}
          <ChartContainer
            title="Top Problem Domains"
            description="Sections with the most RED + YELLOW findings"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={problemDomainData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={180}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="RED + YELLOW"
                  fill={COLORS.RED}
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Performance Trend */}
          <ChartContainer
            title="Performance Trend"
            description="Average completion score over time (last 30 days)"
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={data?.trendData ?? []}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(val: string) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    name === 'Avg Score' ? `${value}%` : value,
                    name,
                  ]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(label: any) => {
                    const d = new Date(String(label));
                    return d.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12, color: '#64748B' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Avg Score"
                  stroke={COLORS.PRIMARY}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: COLORS.PRIMARY }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  name="Submissions"
                  stroke={COLORS.DARK_GREEN}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: COLORS.DARK_GREEN }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
