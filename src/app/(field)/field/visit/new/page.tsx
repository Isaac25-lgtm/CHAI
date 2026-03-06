'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, ChevronLeft, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Facility {
  id: string;
  name: string;
  code: string;
  level: string;
  district: { name: string };
}

export default function PickFacilityPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ data: Facility[] }>({
    queryKey: ['facilities-list', search],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/facilities?${params}`);
      if (!res.ok) throw new Error('Failed to load facilities');
      return res.json();
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/field')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Pick Facility</h1>
          <p className="text-xs text-slate-500">Step 1 of 6</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or district..."
          className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
        />
      </div>

      {/* Facility list */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {data?.data?.map((facility) => (
            <button
              key={facility.id}
              onClick={() => createVisit.mutate(facility.id)}
              disabled={createVisit.isPending}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:border-[#0F4C81]/30 hover:shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Building2 className="size-5 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{facility.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {facility.district.name} · {facility.level.replace('_', ' ')}
                </p>
              </div>
              {createVisit.isPending && createVisit.variables === facility.id && (
                <Loader2 className="size-4 animate-spin text-[#0F4C81]" />
              )}
            </button>
          ))}

          {data?.data?.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              No facilities found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
