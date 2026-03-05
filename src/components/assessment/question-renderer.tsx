'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, AlertCircle, Asterisk } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { QuestionDef } from '@/config/assessment-sections';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestionValue {
  value: string | null;
  numericValue: number | null;
  evidenceNotes: string | null;
  sampledData: Record<string, string>[] | null;
}

interface QuestionRendererProps {
  question: QuestionDef;
  currentValue: QuestionValue;
  onChange: (questionCode: string, newValue: Partial<QuestionValue>) => void;
  disabled?: boolean;
  index: number;
}

// ---------------------------------------------------------------------------
// Sampled rows config (for chart audit)
// ---------------------------------------------------------------------------

const CHART_AUDIT_COLUMNS = [
  { key: 'VL_DONE', label: 'VL Done' },
  { key: 'VL_SUPPRESSED', label: 'VL Suppressed' },
  { key: 'STI_SCREEN', label: 'STI Screen' },
  { key: 'FP_COUNSEL', label: 'FP Counselling' },
  { key: 'RETENTION', label: 'Retention Doc.' },
];

const CHART_ROW_COUNT = 10;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function YesNoInput({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string | null;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      value={value ?? ''}
      onValueChange={onChange}
      className="flex flex-wrap gap-3"
      disabled={disabled}
    >
      {options.map((opt) => (
        <Label
          key={opt.value}
          className={cn(
            'flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2.5 transition-all duration-150',
            value === opt.value
              ? opt.value === 'YES'
                ? 'border-green-300 bg-green-50 text-green-700 ring-1 ring-green-200'
                : opt.value === 'NO'
                  ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200'
                  : 'border-[#0F4C81]/30 bg-[#0F4C81]/5 text-[#0F4C81] ring-1 ring-[#0F4C81]/20'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <RadioGroupItem value={opt.value} className="sr-only" />
          <span className="text-sm font-medium">{opt.label}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}

function SampledRowsGrid({
  sampledData,
  onChange,
  disabled,
}: {
  sampledData: Record<string, string>[] | null;
  onChange: (data: Record<string, string>[]) => void;
  disabled?: boolean;
}) {
  // Initialize rows if empty
  const rows: Record<string, string>[] = sampledData && sampledData.length === CHART_ROW_COUNT
    ? sampledData
    : Array.from({ length: CHART_ROW_COUNT }, () => ({}));

  const handleToggle = useCallback(
    (rowIndex: number, colKey: string) => {
      if (disabled) return;
      const newRows = rows.map((row, i) => {
        if (i !== rowIndex) return { ...row };
        const current = row[colKey];
        const newVal = current === 'YES' ? 'NO' : 'YES';
        return { ...row, [colKey]: newVal };
      });
      onChange(newRows);
    },
    [rows, disabled, onChange],
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F8FAFC]">
            <th className="whitespace-nowrap border-b border-r border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-[#64748B]">
              Chart #
            </th>
            {CHART_AUDIT_COLUMNS.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap border-b border-r border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-[#64748B] last:border-r-0"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={cn(
                'transition-colors',
                rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
              )}
            >
              <td className="border-b border-r border-gray-100 px-3 py-2 text-xs font-medium text-[#64748B]">
                {rowIdx + 1}
              </td>
              {CHART_AUDIT_COLUMNS.map((col) => {
                const val = row[col.key];
                const isYes = val === 'YES';
                const isNo = val === 'NO';
                return (
                  <td
                    key={col.key}
                    className="border-b border-r border-gray-100 px-3 py-1.5 text-center last:border-r-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(rowIdx, col.key)}
                      disabled={disabled}
                      className={cn(
                        'mx-auto flex size-8 items-center justify-center rounded-md border text-xs font-bold transition-all duration-100',
                        isYes
                          ? 'border-green-300 bg-green-100 text-green-700'
                          : isNo
                            ? 'border-red-300 bg-red-100 text-red-700'
                            : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300',
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      {isYes ? 'Y' : isNo ? 'N' : '-'}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function QuestionRenderer({
  question,
  currentValue,
  onChange,
  disabled = false,
  index,
}: QuestionRendererProps) {
  const [showHelp, setShowHelp] = useState(false);

  const handleValueChange = useCallback(
    (val: string | null) => {
      onChange(question.code, { value: val });
    },
    [question.code, onChange],
  );

  const handleNumericChange = useCallback(
    (val: string) => {
      const num = val === '' ? null : parseFloat(val);
      onChange(question.code, {
        value: val === '' ? null : val,
        numericValue: num,
      });
    },
    [question.code, onChange],
  );

  const handleEvidenceChange = useCallback(
    (val: string) => {
      onChange(question.code, { evidenceNotes: val || null });
    },
    [question.code, onChange],
  );

  const handleMultiSelectChange = useCallback(
    (optVal: string, checked: boolean) => {
      const current = currentValue.value ? currentValue.value.split(',') : [];
      const next = checked
        ? [...current, optVal]
        : current.filter((v) => v !== optVal);
      onChange(question.code, { value: next.length > 0 ? next.join(',') : null });
    },
    [question.code, currentValue.value, onChange],
  );

  const handleSampledDataChange = useCallback(
    (data: Record<string, string>[]) => {
      onChange(question.code, { sampledData: data });
    },
    [question.code, onChange],
  );

  // -------------------------------------------------------------------------
  // Render the input control based on response type
  // -------------------------------------------------------------------------

  function renderInput() {
    switch (question.responseType) {
      case 'YES_NO':
        return (
          <YesNoInput
            value={currentValue.value}
            onChange={handleValueChange}
            options={[
              { value: 'YES', label: 'Yes' },
              { value: 'NO', label: 'No' },
            ]}
            disabled={disabled}
          />
        );

      case 'YES_NO_NA':
        return (
          <YesNoInput
            value={currentValue.value}
            onChange={handleValueChange}
            options={[
              { value: 'YES', label: 'Yes' },
              { value: 'NO', label: 'No' },
              { value: 'NA', label: 'N/A' },
            ]}
            disabled={disabled}
          />
        );

      case 'NUMERIC':
        return (
          <Input
            type="number"
            value={currentValue.value ?? ''}
            onChange={(e) => handleNumericChange(e.target.value)}
            placeholder="Enter number..."
            className="max-w-xs"
            disabled={disabled}
          />
        );

      case 'TEXT':
        return (
          <Textarea
            value={currentValue.value ?? ''}
            onChange={(e) => handleValueChange(e.target.value || null)}
            placeholder="Enter response..."
            rows={3}
            className="max-w-lg resize-y"
            disabled={disabled}
          />
        );

      case 'DROPDOWN':
        return (
          <Select
            value={currentValue.value ?? ''}
            onValueChange={handleValueChange}
            disabled={disabled}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {(question.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'MULTI_SELECT': {
        const selectedVals = currentValue.value ? currentValue.value.split(',') : [];
        return (
          <div className="flex flex-wrap gap-3">
            {(question.options ?? []).map((opt) => (
              <Label
                key={opt.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2.5 transition-all',
                  selectedVals.includes(opt.value)
                    ? 'border-[#0F4C81]/30 bg-[#0F4C81]/5 text-[#0F4C81] ring-1 ring-[#0F4C81]/20'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <Checkbox
                  checked={selectedVals.includes(opt.value)}
                  onCheckedChange={(checked) =>
                    handleMultiSelectChange(opt.value, !!checked)
                  }
                  disabled={disabled}
                />
                <span className="text-sm">{opt.label}</span>
              </Label>
            ))}
          </div>
        );
      }

      case 'SAMPLED_ROWS':
        return (
          <SampledRowsGrid
            sampledData={currentValue.sampledData}
            onChange={handleSampledDataChange}
            disabled={disabled}
          />
        );

      case 'DATE':
        return (
          <Input
            type="date"
            value={currentValue.value ?? ''}
            onChange={(e) => handleValueChange(e.target.value || null)}
            className="max-w-xs"
            disabled={disabled}
          />
        );

      default:
        return (
          <p className="text-sm italic text-[#94A3B8]">
            Unsupported question type: {question.responseType}
          </p>
        );
    }
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border transition-all duration-200',
        disabled ? 'border-gray-100 bg-gray-50/50' : 'border-gray-200 bg-white',
      )}
    >
      <CardContent className="p-5 sm:p-6">
        {/* Question header */}
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">
            {index}
          </span>
          <div className="flex-1 space-y-1">
            <div className="flex items-start gap-2">
              <p className="text-sm font-medium leading-snug text-[#1E293B]">
                {question.text}
              </p>
              {question.required && (
                <Asterisk className="mt-0.5 size-3 shrink-0 text-red-400" />
              )}
              {question.helpText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setShowHelp(!showHelp)}
                        className="mt-0.5 shrink-0"
                      >
                        <HelpCircle className="size-4 text-[#94A3B8] hover:text-[#64748B]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs text-xs"
                    >
                      {question.helpText}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Help text expanded */}
            {showHelp && question.helpText && (
              <div className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                <p className="text-xs leading-relaxed text-blue-700">
                  {question.helpText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Input control */}
        <div className="ml-9">
          {renderInput()}
        </div>

        {/* Evidence notes (if required) */}
        {question.requiresEvidence && (
          <div className="ml-9 mt-4">
            <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
              <span>Evidence / Notes</span>
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[9px] text-amber-600"
              >
                Required
              </Badge>
            </Label>
            <Textarea
              value={currentValue.evidenceNotes ?? ''}
              onChange={(e) => handleEvidenceChange(e.target.value)}
              placeholder="Describe the evidence observed..."
              rows={2}
              className="resize-y text-sm"
              disabled={disabled}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
