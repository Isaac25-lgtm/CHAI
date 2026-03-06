'use client';

import { use, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  fullName: string;
  phone: string | null;
}

interface VisitData {
  id: string;
  facility: { name: string };
  participants: Participant[];
}

interface PaymentEntry {
  participantName: string;
  phone: string;
  network: 'MTN' | 'AIRTEL' | 'OTHER';
  amount: string;
}

export default function PaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { data: visit, isLoading } = useQuery<VisitData>({
    queryKey: ['visit-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/visits/${id}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  // Pre-fill from participants on first load
  if (visit && !loaded) {
    setPayments(
      (visit.participants || []).map((p) => ({
        participantName: p.fullName,
        phone: p.phone || '',
        network: 'MTN' as const,
        amount: '',
      })),
    );
    setLoaded(true);
  }

  const updateField = useCallback(
    (idx: number, field: keyof PaymentEntry, value: string) => {
      setPayments((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
      );
    },
    [],
  );

  // We'll save payments by first importing participants to names registry,
  // then creating payment records. This is done in bulk on "Next".
  const savePayments = useMutation({
    mutationFn: async () => {
      // 1. Import participants to names registry
      const importRes = await fetch('/api/names-registry/import-from-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: id }),
      });
      if (!importRes.ok) {
        const err = await importRes.json();
        // 409 or "already imported" is fine
        if (importRes.status !== 409 && !err.message?.includes('already')) {
          throw new Error(err.error || 'Failed to import participants');
        }
      }

      // 2. Get the names registry entries for this visit
      const namesRes = await fetch(`/api/names-registry?visitId=${id}&pageSize=100`);
      if (!namesRes.ok) throw new Error('Failed to get names');
      const namesData = await namesRes.json();

      // 3. Create payment records for entries that have payment info
      const validPayments = payments.filter((p) => p.phone && p.amount);
      for (const payment of validPayments) {
        // Find matching names entry
        const entry = namesData.data?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (n: any) => n.fullName === payment.participantName && !n.paymentRecord,
        );
        if (!entry) continue;

        const amount = parseFloat(payment.amount);
        if (isNaN(amount) || amount <= 0) continue;

        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namesEntryId: entry.id,
            paymentCategory: 'TRANSPORT',
            amount,
            phone: payment.phone,
            network: payment.network,
          }),
        });
      }
    },
    onSuccess: () => {
      toast.success('Payment details saved');
      router.push(`/field/visit/${id}/review`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

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
          <h1 className="text-lg font-bold text-slate-900">Payment Details</h1>
          <p className="text-xs text-slate-500">Step 4 of 6 · {visit?.facility?.name}</p>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Enter mobile money details for each participant. Leave blank if not applicable.
      </p>

      {/* Payment entries */}
      <div className="space-y-3">
        {payments.map((p, idx) => (
          <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <CreditCard className="size-3.5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{p.participantName}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="tel"
                value={p.phone}
                onChange={(e) => updateField(idx, 'phone', e.target.value)}
                placeholder="Phone"
                className="col-span-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
              />
              <select
                value={p.network}
                onChange={(e) => updateField(idx, 'network', e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-2.5 text-sm focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
              >
                <option value="MTN">MTN</option>
                <option value="AIRTEL">Airtel</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="mt-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">UGX</span>
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) => updateField(idx, 'amount', e.target.value)}
                  placeholder="Amount"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-11 pr-3 text-sm placeholder:text-slate-400 focus:border-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
              </div>
            </div>
          </div>
        ))}

        {payments.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            No participants to add payments for. Go back and add participants first.
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => router.push(`/field/visit/${id}`)}
          className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Skip
        </button>
        <button
          onClick={() => savePayments.mutate()}
          disabled={savePayments.isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0F4C81] py-2.5 text-sm font-semibold text-white hover:bg-[#0D3F6B] disabled:opacity-50"
        >
          {savePayments.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Next
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
