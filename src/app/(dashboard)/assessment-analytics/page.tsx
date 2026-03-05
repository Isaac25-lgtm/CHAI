'use client';

import { useState, useCallback } from 'react';
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
  LineChart,
  Line,
} from 'recharts';
import { PageHeader } from '@/components/common/page-header';
import { ChartContainer } from '@/components/common/chart-container';
import { DataTable, type Column } from '@/components/common/data-table';
import { FilterBar, type FilterValues } from '@/components/common/filter-bar';
import {
  ChartSkeleton,
  TableSkeleton,
} from '@/components/common/loading-skeleton';
import { ASSESSMENT_SECTIONS } from '@/config/constants';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Chart colors
// ---------------------------------------------------------------------------

const COLORS = {
  RED: '#DC2626',
  YELLOW: '#EAB308',
  LIGHT_GREEN: '#4ADE80',
  DARK_GREEN: '#16A34A',
  PRIMARY: '#0F4C81',
};

const COLOR_BG: Record<string, string> = {
  RED: 'bg-red-500',
  YELLOW: 'bg-amber-400',
  LIGHT_GREEN: 'bg-emerald-400',
  DARK_GREEN: 'bg-green-600',
  NOT_SCORED: 'bg-gray-300',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DomainBreakdown {
  sectionNumber: number;
  title: string;
  RED: number;
  YELLOW: number;
  LIGHT_GREEN: number;
  DARK_GREEN: number;
  NOT_SCORED: number;
  total: number;
}

interface HeatmapRow {
  districtId: string;
  districtName: string;
  sections: Record<string, { dominantColor: string; avgPct: number }>;
}

interface SectionInfo {
  key: string;
  number: number;
  title: string;
}

interface FacilityRank {
  facilityId: string;
  name: string;
  level: string;
  district: string;
  visits: number;
  performancePct: number;
  avgCompletion: number;
  redCount: number;
}

interface AnalyticsData {
  domainBreakdown: DomainBreakdown[];
  districtHeatmap: HeatmapRow[];
  sections: SectionInfo[];
  facilityComparison: FacilityRank[];
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

export default function AssessmentAnalyticsPage() {
  const [filters, setFilters] = useState<FilterValues>({});

  const queryParams = new URLSearchParams();
  if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);
  if (filters.district) queryParams.set('district', filters.district);

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['assessment-analytics', filters],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  // Prepare stacked bar data for domain breakdown
  const domainBarData = (data?.domainBreakdown ?? []).map((d) => ({
    name: `S${d.sectionNumber}`,
    fullName: d.title,
    RED: d.total > 0 ? Math.round((d.RED / d.total) * 100) : 0,
    YELLOW: d.total > 0 ? Math.round((d.YELLOW / d.total) * 100) : 0,
    LIGHT_GREEN: d.total > 0 ? Math.round((d.LIGHT_GREEN / d.total) * 100) : 0,
    DARK_GREEN: d.total > 0 ? Math.round((d.DARK_GREEN / d.total) * 100) : 0,
  }));

  // Facility comparison columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facilityColumns: Column<any>[] = [
    {
      key: 'rank',
      title: '#',
      render: (_: FacilityRank, _idx?: number) => {
        const idx = data?.facilityComparison.indexOf(_) ?? 0;
        return <span className="font-medium text-[#64748B]">{idx + 1}</span>;
      },
      className: 'w-12',
    },
    {
      key: 'name',
      title: 'Facility',
      sortable: true,
      render: (item: FacilityRank) => (
        <div>
          <p className="font-medium text-[#1E293B]">{item.name}</p>
          <p className="text-xs text-[#64748B]">{item.district}</p>
        </div>
      ),
    },
    {
      key: 'level',
      title: 'Level',
      sortable: true,
      render: (item: FacilityRank) => (
        <span className="text-sm text-[#64748B]">
          {item.level.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'visits',
      title: 'Visits',
      sortable: true,
    },
    {
      key: 'performancePct',
      title: 'Performance',
      sortable: true,
      render: (item: FacilityRank) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              className={cn(
                'h-full rounded-full',
                item.performancePct >= 75
                  ? 'bg-green-500'
                  : item.performancePct >= 50
                    ? 'bg-emerald-400'
                    : item.performancePct >= 25
                      ? 'bg-amber-400'
                      : 'bg-red-500',
              )}
              style={{ width: `${item.performancePct}%` }}
            />
          </div>
          <span className="text-sm font-medium">{item.performancePct}%</span>
        </div>
      ),
    },
    {
      key: 'avgCompletion',
      title: 'Completion',
      sortable: true,
      render: (item: FacilityRank) => (
        <span className="text-sm">{item.avgCompletion}%</span>
      ),
    },
    {
      key: 'redCount',
      title: 'RED Findings',
      sortable: true,
      render: (item: FacilityRank) => (
        <span
          className={
            item.redCount > 0
              ? 'font-semibold text-red-600'
              : 'text-[#64748B]'
          }
        >
          {item.redCount}
        </span>
      ),
    },
  ];

  // Heatmap section headers
  const heatmapSections = data?.sections ?? ASSESSMENT_SECTIONS.map((s, i) => ({
    key: `S${s.number}`,
    number: s.number,
    title: s.title,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Analytics"
        description="Domain breakdown, district heatmap, and facility performance comparisons"
      />

      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        showDateRange
        showDistrict={false}
        showFacilityLevel={false}
        showColorStatus={false}
      />

      {/* Row 1: Domain Breakdown - Stacked horizontal bar chart */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <ChartContainer
          title="Domain Breakdown"
          description="Percentage distribution of color status per assessment section"
        >
          <ResponsiveContainer width="100%" height={Math.max(400, domainBarData.length * 35)}>
            <BarChart
              data={domainBarData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={50}
                tick={{ fontSize: 12, fill: '#64748B' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = domainBarData.find((d) => d.name === label);
                  return (
                    <div className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 shadow-lg">
                      <p className="mb-1.5 text-sm font-medium text-[#1E293B]">
                        {item?.fullName ?? label}
                      </p>
                      {payload.map((entry, idx) => (
                        <p key={idx} className="text-sm" style={{ color: entry.color as string }}>
                          {entry.name}: <span className="font-semibold">{entry.value}%</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="RED" name="Red" stackId="stack" fill={COLORS.RED} />
              <Bar dataKey="YELLOW" name="Yellow" stackId="stack" fill={COLORS.YELLOW} />
              <Bar dataKey="LIGHT_GREEN" name="Light Green" stackId="stack" fill={COLORS.LIGHT_GREEN} />
              <Bar dataKey="DARK_GREEN" name="Dark Green" stackId="stack" fill={COLORS.DARK_GREEN} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {/* Row 2: District x Domain Heatmap */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={8} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          <div className="border-b border-[#E2E8F0] px-6 py-4">
            <h3 className="text-base font-semibold text-[#1E293B]">
              District x Domain Heatmap
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Dominant color status per district and section
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="sticky left-0 z-10 bg-[#F8FAFC] px-4 py-3 text-left text-xs font-medium text-[#64748B]">
                    District
                  </th>
                  {heatmapSections.map((s) => (
                    <th
                      key={s.key}
                      className="px-2 py-3 text-center text-xs font-medium text-[#64748B]"
                      title={s.title}
                    >
                      S{s.number}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.districtHeatmap ?? []).map((row) => (
                  <tr
                    key={row.districtId}
                    className="border-b border-[#E2E8F0] last:border-b-0"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-[#1E293B]">
                      {row.districtName}
                    </td>
                    {heatmapSections.map((s) => {
                      const cell = row.sections[s.key];
                      const color = cell?.dominantColor ?? 'NOT_SCORED';
                      return (
                        <td key={s.key} className="px-2 py-2 text-center">
                          <div
                            className={cn(
                              'mx-auto size-7 rounded-md',
                              COLOR_BG[color] ?? 'bg-gray-200',
                            )}
                            title={`${color} (${cell?.avgPct ?? 0}%)`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {(!data?.districtHeatmap || data.districtHeatmap.length === 0) && (
                  <tr>
                    <td
                      colSpan={heatmapSections.length + 1}
                      className="px-4 py-8 text-center text-sm text-[#64748B]"
                    >
                      No heatmap data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 border-t border-[#E2E8F0] px-6 py-3">
            {Object.entries(COLOR_BG).filter(([k]) => k !== 'NOT_SCORED').map(([label, bgClass]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn('size-3 rounded-sm', bgClass)} />
                <span className="text-xs text-[#64748B]">{label.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 3: Facility Comparison Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-[#1E293B]">
              Facility Comparison
            </h3>
            <p className="text-sm text-[#64748B]">
              Facilities ranked by overall green-domain performance
            </p>
          </div>
          <DataTable
            columns={facilityColumns}
            data={data?.facilityComparison ?? []}
            keyField="facilityId"
            emptyMessage="No facility data available."
          />
        </div>
      )}

      {/* Row 4: Trend Chart */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <ChartContainer
          title="Performance Trend"
          description="Weekly average completion score and submission volume (last 90 days)"
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
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#64748B' }}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: '#64748B' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgScore"
                name="Avg Score %"
                stroke={COLORS.PRIMARY}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.PRIMARY }}
              />
              <Line
                yAxisId="right"
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
      )}
    </div>
  );
}
