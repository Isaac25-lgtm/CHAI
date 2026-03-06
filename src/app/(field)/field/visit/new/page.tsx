'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, ChevronLeft, Building2, MapPin, Loader2, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface District {
  id: string;
  name: string;
  regionName: string;
}

interface Facility {
  id: string;
  name: string;
  code: string;
  level: string;
  districtName: string;
}

export default function PickFacilityPage() {
  const router = useRouter();
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [search, setSearch] = useState('');

  // Step 1: Load districts
  const { data: districtData, isLoading: districtsLoading } = useQuery<{
    flat: District[];
  }>({
    queryKey: ['districts-list'],
    queryFn: async () => {
      const res = await fetch('/api/facilities/districts');
      if (!res.ok) throw new Error('Failed to load districts');
      return res.json();
    },
  });

  // Step 2: Load facilities for selected district
  const { data: facilityData, isLoading: facilitiesLoading } = useQuery<{
    data: Facility[];
  }>({
    queryKey: ['facilities-list', selectedDistrict?.id, search],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: '50' });
      if (selectedDistrict) params.set('districtId', selectedDistrict.id);
      if (search) params.set('search', search);
      const res = await fetch(`/api/facilities?${params}`);
      if (!res.ok) throw new Error('Failed to load facilities');
      return res.json();
    },
    enabled: !!selectedDistrict,
  });

  // Create a new facility on the fly, then create a visit for it
  const createCustomFacility = useMutation({
    mutationFn: async (facilityName: string) => {
      // Step 1: Create the facility
      const facRes = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: facilityName.trim(),
          level: 'HC_III',
          districtId: selectedDistrict!.id,
        }),
      });
      if (!facRes.ok) {
        const err = await facRes.json();
        throw new Error(err.error || 'Failed to create facility');
      }
      const facility = await facRes.json();

      // Step 2: Create the visit
      const visitRes = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: facility.id,
          visitDate: new Date().toISOString(),
          participants: [],
        }),
      });
      if (!visitRes.ok) {
        const err = await visitRes.json();
        throw new Error(err.error || 'Failed to create visit');
      }
      return visitRes.json();
    },
    onSuccess: (visit) => {
      router.push(`/field/visit/${visit.id}/participants`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const createVisit = useMutation({
    mutationFn: async (facilityId: string) => {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          visitDate: new Date().toISOString(),
          participants: [],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create visit');
      }
      return res.json();
    },
    onSuccess: (visit) => {
      router.push(`/field/visit/${visit.id}/participants`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const isCreating = createVisit.isPending || createCustomFacility.isPending;

  // Filter districts by search when no district is selected
  const filteredDistricts = districtData?.flat?.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.regionName.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  // Check if search matches any existing facility exactly
  const facilities = facilityData?.data ?? [];
  const searchMatchesFacility = facilities.some(
    (f) => f.name.toLowerCase() === search.trim().toLowerCase(),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (selectedDistrict) {
              setSelectedDistrict(null);
              setSearch('');
            } else {
              router.push('/field');
            }
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {selectedDistrict ? 'Pick Facility' : 'Pick District'}
          </h1>
          <p className="text-xs text-slate-500">
            Step {selectedDistrict ? '2' : '1'} of 6
            {selectedDistrict && ` · ${selectedDistrict.name}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            selectedDistrict
              ? 'Search or type a new facility name...'
              : 'Search districts...'
          }
          className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
        />
      </div>

      {/* Step 1: District list */}
      {!selectedDistrict && (
        <>
          {districtsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDistricts.map((district) => (
                <button
                  key={district.id}
                  onClick={() => {
                    setSelectedDistrict(district);
                    setSearch('');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:border-[#0F4C81]/30 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <MapPin className="size-5 text-[#0F4C81]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{district.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{district.regionName} Region</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300" />
                </button>
              ))}

              {filteredDistricts.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-400">
                  No districts found
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Step 2: Facility list */}
      {selectedDistrict && (
        <>
          {facilitiesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Existing facilities */}
              {facilities.map((facility) => (
                <button
                  key={facility.id}
                  onClick={() => createVisit.mutate(facility.id)}
                  disabled={isCreating}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:border-[#0F4C81]/30 hover:shadow-sm active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Building2 className="size-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{facility.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {facility.level.replace('_', ' ')}
                    </p>
                  </div>
                  {isCreating && createVisit.variables === facility.id && (
                    <Loader2 className="size-4 animate-spin text-[#0F4C81]" />
                  )}
                </button>
              ))}

              {/* Add custom facility — shows when search text doesn't match an existing facility */}
              {search.trim().length >= 2 && !searchMatchesFacility && (
                <button
                  onClick={() => createCustomFacility.mutate(search)}
                  disabled={isCreating}
                  className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-[#0F4C81]/30 bg-blue-50/50 p-4 text-left transition-all hover:border-[#0F4C81]/50 hover:bg-blue-50 active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F4C81]/10">
                    <Plus className="size-5 text-[#0F4C81]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#0F4C81]">
                      Add &ldquo;{search.trim()}&rdquo;
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Create new facility in {selectedDistrict.name}
                    </p>
                  </div>
                  {createCustomFacility.isPending && (
                    <Loader2 className="size-4 animate-spin text-[#0F4C81]" />
                  )}
                </button>
              )}

              {facilities.length === 0 && search.trim().length < 2 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-400">
                    No facilities found in {selectedDistrict.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Type a facility name above to add one
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
