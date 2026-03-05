'use client';

import { useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterValues {
  dateFrom?: string;
  dateTo?: string;
  district?: string;
  facilityLevel?: string;
  colorStatus?: string;
}

interface FilterBarProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  districts?: FilterOption[];
  facilityLevels?: FilterOption[];
  showDateRange?: boolean;
  showDistrict?: boolean;
  showFacilityLevel?: boolean;
  showColorStatus?: boolean;
  className?: string;
}

const colorStatusOptions: FilterOption[] = [
  { value: 'RED', label: 'Red' },
  { value: 'YELLOW', label: 'Yellow' },
  { value: 'LIGHT_GREEN', label: 'Light Green' },
  { value: 'DARK_GREEN', label: 'Dark Green' },
  { value: 'NOT_SCORED', label: 'Not Scored' },
];

export function FilterBar({
  filters,
  onFilterChange,
  districts = [],
  facilityLevels = [],
  showDateRange = true,
  showDistrict = true,
  showFacilityLevel = true,
  showColorStatus = true,
  className,
}: FilterBarProps) {
  const updateFilter = useCallback(
    (key: keyof FilterValues, value: string | undefined) => {
      onFilterChange({ ...filters, [key]: value });
    },
    [filters, onFilterChange]
  );

  const resetFilters = useCallback(() => {
    onFilterChange({});
  }, [onFilterChange]);

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ''
  );

  return (
    <div
      className={cn(
        'sticky top-0 z-30 rounded-lg border border-[#E2E8F0] bg-white/95 p-4 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-wrap items-end gap-4">
        {showDateRange && (
          <>
            <div className="min-w-[150px] space-y-1.5">
              <Label
                htmlFor="filter-date-from"
                className="text-xs font-medium text-[#64748B]"
              >
                From
              </Label>
              <Input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                className="h-9 text-sm"
              />
            </div>
            <div className="min-w-[150px] space-y-1.5">
              <Label
                htmlFor="filter-date-to"
                className="text-xs font-medium text-[#64748B]"
              >
                To
              </Label>
              <Input
                id="filter-date-to"
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                className="h-9 text-sm"
              />
            </div>
          </>
        )}

        {showDistrict && districts.length > 0 && (
          <div className="min-w-[180px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">
              District
            </Label>
            <Select
              value={filters.district ?? ''}
              onValueChange={(value) =>
                updateFilter('district', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showFacilityLevel && facilityLevels.length > 0 && (
          <div className="min-w-[180px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">
              Facility Level
            </Label>
            <Select
              value={filters.facilityLevel ?? ''}
              onValueChange={(value) =>
                updateFilter('facilityLevel', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {facilityLevels.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showColorStatus && (
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-[#64748B]">
              Color Status
            </Label>
            <Select
              value={filters.colorStatus ?? ''}
              onValueChange={(value) =>
                updateFilter('colorStatus', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {colorStatusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 gap-1.5 text-[#64748B] hover:text-[#1E293B]"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
