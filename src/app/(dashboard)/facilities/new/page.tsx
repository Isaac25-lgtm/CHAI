'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FACILITY_LEVELS, OWNERSHIP_TYPES, UGANDA_DISTRICTS } from '@/config/constants';

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function NewFacilityPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState('');
  const [ownership, setOwnership] = useState('GOVERNMENT');
  const [districtName, setDistrictName] = useState('');
  const [subcounty, setSubcounty] = useState('');
  const [inChargeName, setInChargeName] = useState('');
  const [inChargePhone, setInChargePhone] = useState('');
  const [implementingPartner, setImplementingPartner] = useState('');

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || null,
          level,
          ownership,
          districtName: districtName,
          subcounty: subcounty.trim() || null,
          inChargeName: inChargeName.trim() || null,
          inChargePhone: inChargePhone.trim() || null,
          implementingPartner: implementingPartner.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to create facility');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Facility created successfully');
      router.push('/facilities');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Facility name is required');
      return;
    }
    if (!level) {
      toast.error('Facility level is required');
      return;
    }
    if (!districtName) {
      toast.error('District is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add New Facility" description="Register a new health facility in the system">
        <Button variant="outline" onClick={() => router.push('/facilities')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Facilities
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Facility Details */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E293B]">Facility Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Facility Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Mulago National Referral Hospital"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Facility Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., MUL-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Facility Level <span className="text-red-500">*</span>
                </Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select facility level" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FACILITY_LEVELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ownership</Label>
                <Select value={ownership} onValueChange={setOwnership}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select ownership type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OWNERSHIP_TYPES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcounty">Subcounty</Label>
                <Input
                  id="subcounty"
                  placeholder="e.g., Kawempe Division"
                  value={subcounty}
                  onChange={(e) => setSubcounty(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location & Contact */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E293B]">Location & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  District <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={districtName || 'NONE'}
                  onValueChange={(v) => setDistrictName(v === 'NONE' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a district" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select a district</SelectItem>
                    {UGANDA_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d} District
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inChargeName">In-Charge Name</Label>
                <Input
                  id="inChargeName"
                  placeholder="Facility in-charge name"
                  value={inChargeName}
                  onChange={(e) => setInChargeName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inChargePhone">In-Charge Phone</Label>
                <Input
                  id="inChargePhone"
                  placeholder="0770000000"
                  value={inChargePhone}
                  onChange={(e) => setInChargePhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ip">Implementing Partner</Label>
                <Input
                  id="ip"
                  placeholder="e.g., CHAI Uganda"
                  value={implementingPartner}
                  onChange={(e) => setImplementingPartner(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/facilities')}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-[#0F4C81] hover:bg-[#0D3F6B]"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Create Facility
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
