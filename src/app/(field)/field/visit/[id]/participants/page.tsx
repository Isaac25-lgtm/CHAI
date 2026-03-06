'use client';

import { use, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  fullName: string;
  role: string;
  cadre: string;
  phone: string;
  teamType: string;
  attendanceStatus: string;
}

interface VisitData {
  id: string;
  status: string;
  facility: { name: string };
  participants: (Participant & { id: string })[];
}

export default function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { data: visit, isLoading } = useQuery<VisitData>({
    queryKey: ['visit-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/visits/${id}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  // Populate from visit data on first load
  if (visit && !loaded) {
    if (visit.participants?.length) {
      setParticipants(
        visit.participants.map((p) => ({
          fullName: p.fullName,
          role: p.role || '',
          cadre: p.cadre || '',
          phone: p.phone || '',
          teamType: p.teamType || 'FACILITY',
          attendanceStatus: p.attendanceStatus || 'PRESENT',
        })),
      );
    }
    setLoaded(true);
  }

  const addParticipant = useCallback(() => {
    setParticipants((prev) => [
      ...prev,
      { fullName: '', role: '', cadre: '', phone: '', teamType: 'FACILITY', attendanceStatus: 'PRESENT' },
    ]);
  }, []);

  const removeParticipant = useCallback((idx: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateField = useCallback((idx: number, field: keyof Participant, value: string) => {
    setParticipants((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    );
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validParticipants = participants.filter((p) => p.fullName.trim());
      const res = await fetch(`/api/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: validParticipants.map((p) => ({
            fullName: p.fullName.trim(),
            role: p.role || null,
            cadre: p.cadre || null,
            phone: p.phone || null,
            teamType: p.teamType,
            attendanceStatus: p.attendanceStatus,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', id] });
      toast.success('Participants saved');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleNext = () => {
    saveMutation.mutate(undefined, {
      onSuccess: () => {
        router.push(`/field/visit/${id}/assess`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/field/visit/${id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Add Participants</h1>
          <p className="text-xs text-slate-500">Step 3 of 6 · {visit?.facility?.name}</p>
        </div>
      </div>

      {/* Participant forms */}
      <div className="space-y-3">
        {participants.map((p, idx) => (
          <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Participant {idx + 1}
              </span>
              <button
                onClick={() => removeParticipant(idx)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={p.fullName}
                onChange={(e) => updateField(idx, 'fullName', e.target.value)}
                placeholder="Full Name *"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={p.role}
                  onChange={(e) => updateField(idx, 'role', e.target.value)}
                  placeholder="Role"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
                <input
                  type="text"
                  value={p.cadre}
                  onChange={(e) => updateField(idx, 'cadre', e.target.value)}
                  placeholder="Cadre"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={p.phone}
                  onChange={(e) => updateField(idx, 'phone', e.target.value)}
                  placeholder="Phone (optional)"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
                <select
                  value={p.teamType}
                  onChange={(e) => updateField(idx, 'teamType', e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                >
                  <option value="FACILITY">Facility</option>
                  <option value="DISTRICT">District</option>
                  <option value="CENTRAL">Central</option>
                  <option value="PARTNER">Partner</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={addParticipant}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
      >
        <Plus className="size-4" />
        Add Participant
      </button>

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleNext}
          disabled={saveMutation.isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0F4C81] py-2.5 text-sm font-semibold text-white hover:bg-[#0D3F6B] disabled:opacity-50"
        >
          Next
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
