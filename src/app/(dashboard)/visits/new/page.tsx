'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Search,
  Building2,
  Users,
  FileText,
  CheckCircle2,
  MapPin,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { ATTENDANCE_LABELS } from '@/config/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacilityOption {
  id: string;
  name: string;
  code: string | null;
  level: string;
  districtName: string;
  regionName: string;
  inChargeName: string | null;
  inChargePhone: string | null;
}

// ---------------------------------------------------------------------------
// Form Schema
// ---------------------------------------------------------------------------

const participantFormSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  role: z.string().optional().default(''),
  cadre: z.string().optional().default(''),
  teamType: z.enum(['CENTRAL', 'DISTRICT', 'FACILITY', 'PARTNER', 'OTHER']),
  organization: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  attendanceStatus: z.enum(['PRESENT', 'PARTIAL', 'ABSENT']).default('PRESENT'),
  remarks: z.string().optional().default(''),
});

const visitFormSchema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  visitDate: z.string().min(1, 'Visit date is required'),
  activityName: z.string().optional().default(''),
  mentorshipCycle: z.string().optional().default(''),
  reportingPeriod: z.string().optional().default(''),
  facilityInCharge: z.string().optional().default(''),
  inChargePhone: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  centralParticipants: z.array(participantFormSchema),
  facilityParticipants: z.array(participantFormSchema),
});

type VisitFormData = z.infer<typeof visitFormSchema>;

// ---------------------------------------------------------------------------
// Step configuration
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, title: 'Visit Details', icon: FileText, description: 'Facility and visit information' },
  { id: 2, title: 'Central Team', icon: Users, description: 'Central team participants' },
  { id: 3, title: 'Facility Team', icon: Building2, description: 'Facility team participants' },
  { id: 4, title: 'Review & Save', icon: CheckCircle2, description: 'Review and submit' },
];

// ---------------------------------------------------------------------------
// Facility Search Combobox
// ---------------------------------------------------------------------------

function FacilityCombobox({
  value,
  onChange,
  selectedFacility,
  onFacilitySelect,
}: {
  value: string;
  onChange: (value: string) => void;
  selectedFacility: FacilityOption | null;
  onFacilitySelect: (facility: FacilityOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: facilities, isLoading } = useQuery<FacilityOption[]>({
    queryKey: ['facilities-search', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      params.set('pageSize', '20');
      params.set('isActive', 'true');
      const res = await fetch(`/api/facilities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch facilities');
      const json = await res.json();
      return json.data;
    },
    enabled: open,
    staleTime: 30000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-[40px] w-full justify-between text-left font-normal"
        >
          {selectedFacility ? (
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium text-[#1E293B]">
                {selectedFacility.name}
              </span>
              <span className="text-xs text-[#64748B]">
                {selectedFacility.districtName} &middot; {selectedFacility.regionName}
              </span>
            </div>
          ) : (
            <span className="text-sm text-[#94A3B8]">Search and select a facility...</span>
          )}
          <Search className="ml-2 size-4 shrink-0 text-[#94A3B8]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search facilities..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin text-[#64748B]" />
                <span className="ml-2 text-sm text-[#64748B]">Searching...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>No facilities found.</CommandEmpty>
                <CommandGroup>
                  {facilities?.map((facility) => (
                    <CommandItem
                      key={facility.id}
                      value={facility.id}
                      onSelect={() => {
                        onChange(facility.id);
                        onFacilitySelect(facility);
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{facility.name}</span>
                          {facility.code && (
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                              {facility.code}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[#64748B]">
                          <MapPin className="size-3" />
                          {facility.districtName}, {facility.regionName}
                        </div>
                      </div>
                      {value === facility.id && (
                        <Check className="size-4 text-[#0F4C81]" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Participant Row Component
// ---------------------------------------------------------------------------

function ParticipantRow({
  index,
  control,
  remove,
  prefix,
  errors,
}: {
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  remove: () => void;
  prefix: 'centralParticipants' | 'facilityParticipants';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
}) {
  const fieldErrors = errors?.[prefix]?.[index];

  return (
    <div className="relative rounded-lg border border-[#E2E8F0] bg-white p-4 transition-shadow hover:shadow-sm">
      {/* Remove button */}
      <button
        type="button"
        onClick={remove}
        className="absolute right-2 top-2 rounded-full p-1 text-[#94A3B8] transition-colors hover:bg-red-50 hover:text-red-500"
        title="Remove participant"
      >
        <X className="size-4" />
      </button>

      <div className="grid grid-cols-1 gap-3 pr-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Full Name */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#64748B]">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Controller
            name={`${prefix}.${index}.fullName`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Enter full name"
                className={`h-9 text-sm ${fieldErrors?.fullName ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
              />
            )}
          />
          {fieldErrors?.fullName && (
            <p className="text-xs text-red-500">{fieldErrors.fullName.message}</p>
          )}
        </div>

        {/* Role / Cadre */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#64748B]">Role / Cadre</Label>
          <Controller
            name={`${prefix}.${index}.role`}
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="e.g., Midwife, Doctor" className="h-9 text-sm" />
            )}
          />
        </div>

        {/* Organization */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#64748B]">Organization</Label>
          <Controller
            name={`${prefix}.${index}.organization`}
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="e.g., CHAI, MoH" className="h-9 text-sm" />
            )}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#64748B]">Phone</Label>
          <Controller
            name={`${prefix}.${index}.phone`}
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="0700000000" className="h-9 text-sm" type="tel" />
            )}
          />
        </div>

        {/* Attendance Status */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#64748B]">Attendance</Label>
          <Controller
            name={`${prefix}.${index}.attendanceStatus`}
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTENDANCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Remarks */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#64748B]">Remarks</Label>
          <Controller
            name={`${prefix}.${index}.remarks`}
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Optional notes" className="h-9 text-sm" />
            )}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function NewVisitPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFacility, setSelectedFacility] = useState<FacilityOption | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<VisitFormData>({
    resolver: zodResolver(visitFormSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      facilityId: '',
      visitDate: new Date().toISOString().split('T')[0],
      activityName: '',
      mentorshipCycle: '',
      reportingPeriod: '',
      facilityInCharge: '',
      inChargePhone: '',
      notes: '',
      centralParticipants: [],
      facilityParticipants: [],
    },
  });

  const {
    fields: centralFields,
    append: appendCentral,
    remove: removeCentral,
  } = useFieldArray({
    control,
    name: 'centralParticipants',
  });

  const {
    fields: facilityFields,
    append: appendFacility,
    remove: removeFacility,
  } = useFieldArray({
    control,
    name: 'facilityParticipants',
  });

  const watchedValues = watch();

  // Auto-fill facility in-charge when facility is selected
  useEffect(() => {
    if (selectedFacility) {
      if (selectedFacility.inChargeName && !getValues('facilityInCharge')) {
        setValue('facilityInCharge', selectedFacility.inChargeName);
      }
      if (selectedFacility.inChargePhone && !getValues('inChargePhone')) {
        setValue('inChargePhone', selectedFacility.inChargePhone);
      }
    }
  }, [selectedFacility, setValue, getValues]);

  // Mutations
  const saveDraftMutation = useMutation({
    mutationFn: async (data: VisitFormData) => {
      const payload = {
        facilityId: data.facilityId,
        visitDate: data.visitDate,
        activityName: data.activityName || null,
        mentorshipCycle: data.mentorshipCycle || null,
        reportingPeriod: data.reportingPeriod || null,
        facilityInCharge: data.facilityInCharge || null,
        inChargePhone: data.inChargePhone || null,
        notes: data.notes || null,
        participants: [
          ...data.centralParticipants.map((p) => ({
            ...p,
            teamType: 'CENTRAL' as const,
            role: p.role || null,
            cadre: p.cadre || null,
            organization: p.organization || null,
            phone: p.phone || null,
            remarks: p.remarks || null,
          })),
          ...data.facilityParticipants.map((p) => ({
            ...p,
            teamType: 'FACILITY' as const,
            role: p.role || null,
            cadre: p.cadre || null,
            organization: p.organization || null,
            phone: p.phone || null,
            remarks: p.remarks || null,
          })),
        ],
      };

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save visit');
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Visit saved as draft', {
        description: `Visit ${data.visitNumber} has been created.`,
      });
      router.push(`/visits/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to save visit', {
        description: error.message,
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: VisitFormData) => {
      // First create the visit
      const payload = {
        facilityId: data.facilityId,
        visitDate: data.visitDate,
        activityName: data.activityName || null,
        mentorshipCycle: data.mentorshipCycle || null,
        reportingPeriod: data.reportingPeriod || null,
        facilityInCharge: data.facilityInCharge || null,
        inChargePhone: data.inChargePhone || null,
        notes: data.notes || null,
        participants: [
          ...data.centralParticipants.map((p) => ({
            ...p,
            teamType: 'CENTRAL' as const,
            role: p.role || null,
            cadre: p.cadre || null,
            organization: p.organization || null,
            phone: p.phone || null,
            remarks: p.remarks || null,
          })),
          ...data.facilityParticipants.map((p) => ({
            ...p,
            teamType: 'FACILITY' as const,
            role: p.role || null,
            cadre: p.cadre || null,
            organization: p.organization || null,
            phone: p.phone || null,
            remarks: p.remarks || null,
          })),
        ],
      };

      const createRes = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || 'Failed to create visit');
      }

      const visit = await createRes.json();

      // Then submit it
      const submitRes = await fetch(`/api/visits/${visit.id}/submit`, {
        method: 'POST',
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.error || 'Failed to submit visit');
      }

      return submitRes.json();
    },
    onSuccess: (data) => {
      toast.success('Visit submitted successfully', {
        description: `Visit ${data.visitNumber} has been submitted.`,
      });
      router.push(`/visits/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to submit visit', {
        description: error.message,
      });
    },
  });

  // Step navigation
  const canGoNext = useCallback(async () => {
    if (currentStep === 1) {
      return trigger(['facilityId', 'visitDate']);
    }
    return true;
  }, [currentStep, trigger]);

  const handleNext = useCallback(async () => {
    const valid = await canGoNext();
    if (valid && currentStep < 4) {
      setCurrentStep((s) => s + 1);
    }
  }, [canGoNext, currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const addCentralParticipant = () => {
    appendCentral({
      fullName: '',
      role: '',
      cadre: '',
      teamType: 'CENTRAL',
      organization: '',
      phone: '',
      attendanceStatus: 'PRESENT',
      remarks: '',
    });
  };

  const addFacilityParticipant = () => {
    appendFacility({
      fullName: '',
      role: '',
      cadre: '',
      teamType: 'FACILITY',
      organization: '',
      phone: '',
      attendanceStatus: 'PRESENT',
      remarks: '',
    });
  };

  const onSaveDraft = handleSubmit(
    (data: any) => saveDraftMutation.mutate(data), // eslint-disable-line @typescript-eslint/no-explicit-any
    () => {
      // If validation fails, try saving with minimal required fields
      const values = getValues() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (values.facilityId && values.visitDate) {
        saveDraftMutation.mutate(values);
      } else {
        toast.error('Please fill in at least the facility and visit date before saving.');
      }
    },
  );

  const onSubmit = handleSubmit((data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const totalParticipants = data.centralParticipants.length + data.facilityParticipants.length;
    if (totalParticipants === 0) {
      toast.error('At least one participant is required to submit.');
      return;
    }
    submitMutation.mutate(data);
  });

  const isSubmitting = saveDraftMutation.isPending || submitMutation.isPending;

  const totalParticipants = centralFields.length + facilityFields.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      {/* Header */}
      <PageHeader title="New Visit" description="Create a new facility mentorship visit">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
      </PageHeader>

      {/* Step Indicator */}
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;

            return (
              <div key={step.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (step.id < currentStep) setCurrentStep(step.id);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors sm:px-3 ${
                    isActive
                      ? 'bg-[#0F4C81]/10 text-[#0F4C81]'
                      : isComplete
                        ? 'text-[#0F4C81] hover:bg-[#0F4C81]/5'
                        : 'text-[#94A3B8]'
                  }`}
                  disabled={step.id > currentStep}
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                      isActive
                        ? 'bg-[#0F4C81] text-white'
                        : isComplete
                          ? 'bg-[#0F4C81]/20 text-[#0F4C81]'
                          : 'bg-[#F1F5F9] text-[#94A3B8]'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="size-4" />
                    ) : (
                      <StepIcon className="size-4" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-medium">{step.title}</div>
                    <div className="text-[10px] opacity-70">{step.description}</div>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-px flex-1 sm:mx-2 ${
                      isComplete ? 'bg-[#0F4C81]/30' : 'bg-[#E2E8F0]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <form>
        {/* Step 1: Visit Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-[#1E293B]">Visit Details</CardTitle>
              <CardDescription>
                Select the facility and provide visit information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Facility Search */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Facility <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="facilityId"
                  control={control}
                  render={({ field }) => (
                    <FacilityCombobox
                      value={field.value}
                      onChange={field.onChange}
                      selectedFacility={selectedFacility}
                      onFacilitySelect={setSelectedFacility}
                    />
                  )}
                />
                {errors.facilityId && (
                  <p className="text-xs text-red-500">{errors.facilityId.message}</p>
                )}
                {selectedFacility && (
                  <div className="flex items-center gap-2 rounded-md bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
                    <MapPin className="size-3.5" />
                    {selectedFacility.districtName}, {selectedFacility.regionName}
                    {selectedFacility.level && (
                      <>
                        <span className="text-[#CBD5E1]">|</span>
                        {selectedFacility.level.replace('_', ' ')}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Visit Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="visitDate" className="text-sm font-medium">
                    Visit Date <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="visitDate"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="visitDate"
                        type="date"
                        className={`h-10 text-sm ${errors.visitDate ? 'border-red-300' : ''}`}
                      />
                    )}
                  />
                  {errors.visitDate && (
                    <p className="text-xs text-red-500">{errors.visitDate.message}</p>
                  )}
                </div>

                {/* Activity Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="activityName" className="text-sm font-medium">
                    Activity Name
                  </Label>
                  <Controller
                    name="activityName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="activityName"
                        placeholder="e.g., Quarterly Mentorship Visit"
                        className="h-10 text-sm"
                      />
                    )}
                  />
                </div>

                {/* Mentorship Cycle */}
                <div className="space-y-1.5">
                  <Label htmlFor="mentorshipCycle" className="text-sm font-medium">
                    Mentorship Cycle
                  </Label>
                  <Controller
                    name="mentorshipCycle"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="mentorshipCycle"
                        placeholder="e.g., Cycle 3"
                        className="h-10 text-sm"
                      />
                    )}
                  />
                </div>

                {/* Reporting Period */}
                <div className="space-y-1.5">
                  <Label htmlFor="reportingPeriod" className="text-sm font-medium">
                    Reporting Period
                  </Label>
                  <Controller
                    name="reportingPeriod"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="reportingPeriod"
                        placeholder="e.g., Q1 FY2026"
                        className="h-10 text-sm"
                      />
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Facility In-Charge */}
                <div className="space-y-1.5">
                  <Label htmlFor="facilityInCharge" className="text-sm font-medium">
                    Facility In-Charge Name
                  </Label>
                  <Controller
                    name="facilityInCharge"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="facilityInCharge"
                        placeholder="Name of facility in-charge"
                        className="h-10 text-sm"
                      />
                    )}
                  />
                </div>

                {/* In-Charge Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="inChargePhone" className="text-sm font-medium">
                    In-Charge Phone
                  </Label>
                  <Controller
                    name="inChargePhone"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="inChargePhone"
                        placeholder="0700000000"
                        type="tel"
                        className="h-10 text-sm"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="notes"
                      placeholder="Any additional notes about this visit..."
                      rows={3}
                      className="text-sm"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Central Team Participants */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-[#1E293B]">Central Team Participants</CardTitle>
                  <CardDescription>
                    Add members from the central mentorship team.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {centralFields.length} participant{centralFields.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {centralFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E2E8F0] py-10 text-center">
                  <Users className="mb-2 size-8 text-[#94A3B8]" />
                  <p className="text-sm font-medium text-[#64748B]">No central team participants yet</p>
                  <p className="mb-4 text-xs text-[#94A3B8]">Click below to add participants</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCentralParticipant}
                    className="gap-1.5"
                  >
                    <Plus className="size-4" />
                    Add Participant
                  </Button>
                </div>
              ) : (
                <>
                  {centralFields.map((field, index) => (
                    <ParticipantRow
                      key={field.id}
                      index={index}
                      control={control}
                      remove={() => removeCentral(index)}
                      prefix="centralParticipants"
                      errors={errors}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCentralParticipant}
                    className="w-full gap-1.5 border-dashed"
                  >
                    <Plus className="size-4" />
                    Add Central Team Participant
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Facility Team Participants */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-[#1E293B]">Facility Team Participants</CardTitle>
                  <CardDescription>
                    Add participants from the visited facility.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  {facilityFields.length} participant{facilityFields.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {facilityFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E2E8F0] py-10 text-center">
                  <Building2 className="mb-2 size-8 text-[#94A3B8]" />
                  <p className="text-sm font-medium text-[#64748B]">No facility participants yet</p>
                  <p className="mb-4 text-xs text-[#94A3B8]">Click below to add participants</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFacilityParticipant}
                    className="gap-1.5"
                  >
                    <Plus className="size-4" />
                    Add Participant
                  </Button>
                </div>
              ) : (
                <>
                  {facilityFields.map((field, index) => (
                    <ParticipantRow
                      key={field.id}
                      index={index}
                      control={control}
                      remove={() => removeFacility(index)}
                      prefix="facilityParticipants"
                      errors={errors}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFacilityParticipant}
                    className="w-full gap-1.5 border-dashed"
                  >
                    <Plus className="size-4" />
                    Add Facility Team Participant
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review & Save */}
        {currentStep === 4 && (
          <div className="space-y-4">
            {/* Visit Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-[#1E293B]">Review Visit Details</CardTitle>
                <CardDescription>
                  Please review the information below before saving.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#94A3B8]">Facility</p>
                    <p className="text-sm font-medium text-[#1E293B]">
                      {selectedFacility?.name || 'Not selected'}
                    </p>
                    {selectedFacility && (
                      <p className="text-xs text-[#64748B]">
                        {selectedFacility.districtName}, {selectedFacility.regionName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#94A3B8]">Visit Date</p>
                    <p className="text-sm font-medium text-[#1E293B]">
                      {watchedValues.visitDate
                        ? new Date(watchedValues.visitDate + 'T00:00:00').toLocaleDateString('en-UG', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '--'}
                    </p>
                  </div>
                  {watchedValues.activityName && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[#94A3B8]">Activity</p>
                      <p className="text-sm text-[#1E293B]">{watchedValues.activityName}</p>
                    </div>
                  )}
                  {watchedValues.mentorshipCycle && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[#94A3B8]">Mentorship Cycle</p>
                      <p className="text-sm text-[#1E293B]">{watchedValues.mentorshipCycle}</p>
                    </div>
                  )}
                  {watchedValues.reportingPeriod && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[#94A3B8]">Reporting Period</p>
                      <p className="text-sm text-[#1E293B]">{watchedValues.reportingPeriod}</p>
                    </div>
                  )}
                  {watchedValues.facilityInCharge && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[#94A3B8]">Facility In-Charge</p>
                      <p className="text-sm text-[#1E293B]">
                        {watchedValues.facilityInCharge}
                        {watchedValues.inChargePhone && (
                          <span className="ml-1 text-[#64748B]">({watchedValues.inChargePhone})</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                {watchedValues.notes && (
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-medium text-[#94A3B8]">Notes</p>
                    <p className="text-sm text-[#64748B]">{watchedValues.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participants Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-[#1E293B]">Participants Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Central Team */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-[#1E293B]">Central Team</h4>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {centralFields.length}
                      </Badge>
                    </div>
                    {centralFields.length > 0 ? (
                      <div className="space-y-1">
                        {watchedValues.centralParticipants.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-md bg-[#F8FAFC] px-3 py-2 text-sm"
                          >
                            <div>
                              <span className="font-medium text-[#1E293B]">{p.fullName || 'Unnamed'}</span>
                              {p.role && <span className="ml-2 text-xs text-[#64748B]">{p.role}</span>}
                              {p.organization && (
                                <span className="ml-1 text-xs text-[#94A3B8]">- {p.organization}</span>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                p.attendanceStatus === 'PRESENT'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : p.attendanceStatus === 'PARTIAL'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {ATTENDANCE_LABELS[p.attendanceStatus] || p.attendanceStatus}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#94A3B8]">No central team participants added.</p>
                    )}
                  </div>

                  <Separator />

                  {/* Facility Team */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-[#1E293B]">Facility Team</h4>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {facilityFields.length}
                      </Badge>
                    </div>
                    {facilityFields.length > 0 ? (
                      <div className="space-y-1">
                        {watchedValues.facilityParticipants.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-md bg-[#F8FAFC] px-3 py-2 text-sm"
                          >
                            <div>
                              <span className="font-medium text-[#1E293B]">{p.fullName || 'Unnamed'}</span>
                              {p.role && <span className="ml-2 text-xs text-[#64748B]">{p.role}</span>}
                              {p.organization && (
                                <span className="ml-1 text-xs text-[#94A3B8]">- {p.organization}</span>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                p.attendanceStatus === 'PRESENT'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : p.attendanceStatus === 'PARTIAL'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {ATTENDANCE_LABELS[p.attendanceStatus] || p.attendanceStatus}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#94A3B8]">No facility team participants added.</p>
                    )}
                  </div>

                  {totalParticipants === 0 && (
                    <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      At least one participant is required to submit the visit.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </form>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E8F0] bg-white px-4 py-3 shadow-lg sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Save Draft - available at any step */}
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              {saveDraftMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              <span className="hidden sm:inline">Save Draft</span>
            </Button>

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="gap-1.5 bg-[#0F4C81] hover:bg-[#0D3F6B]"
              >
                <span className="hidden sm:inline">Next</span>
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting || totalParticipants === 0}
                className="gap-1.5 bg-[#0F4C81] hover:bg-[#0D3F6B]"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Submit Visit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
