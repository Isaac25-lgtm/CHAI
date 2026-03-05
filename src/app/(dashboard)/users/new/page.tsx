'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { ROLE_LABELS } from '@/config/constants';

// ---------------------------------------------------------------------------
// Form schema (extends createUserSchema with confirmPassword)
// ---------------------------------------------------------------------------

const formSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
    role: z.enum([
      'SUPER_ADMIN',
      'NATIONAL_ADMIN',
      'DISTRICT_SUPERVISOR',
      'FIELD_ASSESSOR',
      'FINANCE_OFFICER',
      'VIEWER',
    ]),
    regionId: z.string().optional(),
    districtId: z.string().optional(),
    phone: z.string().optional(),
    organization: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof formSchema>;

interface Region {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
  regionId: string;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function NewUserPage() {
  const router = useRouter();
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'FIELD_ASSESSOR',
      regionId: '',
      districtId: '',
      phone: '',
      organization: '',
    },
  });

  const watchedRole = watch('role');

  // Fetch regions
  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await fetch('/api/facilities/regions');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? json;
    },
  });

  // Fetch districts (filtered by region)
  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ['districts', selectedRegionId],
    queryFn: async () => {
      const params = selectedRegionId
        ? `?regionId=${selectedRegionId}`
        : '';
      const res = await fetch(`/api/facilities/districts${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? json;
    },
  });

  // Reset district when region changes
  useEffect(() => {
    setValue('districtId', '');
  }, [selectedRegionId, setValue]);

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { confirmPassword: _confirm, ...payload } = data;
      // Clean empty strings to null
      const cleaned = {
        ...payload,
        regionId: payload.regionId || null,
        districtId: payload.districtId || null,
        phone: payload.phone || null,
        organization: payload.organization || null,
      };
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('User created successfully');
      router.push('/users');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  // Determine if role needs geographic assignment
  const needsGeography = [
    'DISTRICT_SUPERVISOR',
    'FIELD_ASSESSOR',
    'VIEWER',
  ].includes(watchedRole);

  return (
    <div className="space-y-6">
      <PageHeader title="Add New User" description="Create a new system user account">
        <Button variant="outline" onClick={() => router.push('/users')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Users
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E293B]">
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@chai.org"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="0770000000"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>

              {/* Organization */}
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  placeholder="e.g., CHAI Uganda"
                  {...register('organization')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security & Access */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E293B]">
                Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watchedRole}
                  onValueChange={(value) =>
                    setValue('role', value as FormData['role'])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-xs text-red-500">{errors.role.message}</p>
                )}
              </div>

              {/* Region */}
              {needsGeography && (
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select
                    value={selectedRegionId}
                    onValueChange={(value) => {
                      const v = value === 'NONE' ? '' : value;
                      setSelectedRegionId(v);
                      setValue('regionId', v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No Region</SelectItem>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* District */}
              {needsGeography && (
                <div className="space-y-2">
                  <Label>District</Label>
                  <Select
                    value={watch('districtId') || ''}
                    onValueChange={(value) =>
                      setValue('districtId', value === 'NONE' ? '' : value)
                    }
                    disabled={!selectedRegionId && districts.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          selectedRegionId
                            ? 'Select a district'
                            : 'Select a region first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No District</SelectItem>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/users')}
          >
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
                Create User
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
