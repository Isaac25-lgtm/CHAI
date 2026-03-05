'use client';

import { cn } from '@/lib/utils';
import { StatusBadge, type ColorStatus } from '@/components/common/status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Circle, Minus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionNavItem {
  number: number;
  title: string;
  completionStatus: 'empty' | 'partial' | 'complete';
  colorStatus?: ColorStatus;
  questionCount: number;
  answeredCount: number;
}

interface SectionNavProps {
  sections: SectionNavItem[];
  currentSection: number;
  onSelect: (sectionNumber: number) => void;
  isSubmitted?: boolean;
}

// ---------------------------------------------------------------------------
// Completion indicator
// ---------------------------------------------------------------------------

function CompletionIcon({ status }: { status: 'empty' | 'partial' | 'complete' }) {
  if (status === 'complete') {
    return (
      <div className="flex size-5 items-center justify-center rounded-full bg-green-100">
        <Check className="size-3 text-green-600" />
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="flex size-5 items-center justify-center rounded-full bg-amber-100">
        <Minus className="size-3 text-amber-600" />
      </div>
    );
  }
  return (
    <div className="flex size-5 items-center justify-center rounded-full bg-gray-100">
      <Circle className="size-3 text-gray-400" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop sidebar
// ---------------------------------------------------------------------------

function SectionNavDesktop({ sections, currentSection, onSelect, isSubmitted }: SectionNavProps) {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-24 w-64 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Assessment Sections
          </h3>
        </div>
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="p-2">
            {sections.map((section) => {
              const isActive = section.number === currentSection;
              return (
                <button
                  key={section.number}
                  onClick={() => onSelect(section.number)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                    isActive
                      ? 'bg-[#0F4C81]/5 ring-1 ring-[#0F4C81]/20'
                      : 'hover:bg-gray-50',
                  )}
                >
                  {/* Section number */}
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                      isActive
                        ? 'bg-[#0F4C81] text-white'
                        : 'bg-gray-100 text-[#64748B] group-hover:bg-gray-200',
                    )}
                  >
                    {section.number}
                  </span>

                  {/* Title and progress */}
                  <div className="flex-1 overflow-hidden">
                    <p
                      className={cn(
                        'truncate text-[13px] font-medium leading-tight',
                        isActive ? 'text-[#0F4C81]' : 'text-[#1E293B]',
                      )}
                    >
                      {section.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                      {section.answeredCount}/{section.questionCount} answered
                    </p>
                  </div>

                  {/* Status indicator */}
                  <div className="shrink-0">
                    {isSubmitted && section.colorStatus ? (
                      <StatusBadge status={section.colorStatus} size="sm" />
                    ) : (
                      <CompletionIcon status={section.completionStatus} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile top bar
// ---------------------------------------------------------------------------

function SectionNavMobile({ sections, currentSection, onSelect, isSubmitted }: SectionNavProps) {
  return (
    <div className="lg:hidden">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex w-max gap-1.5 p-2">
            {sections.map((section) => {
              const isActive = section.number === currentSection;
              return (
                <button
                  key={section.number}
                  onClick={() => onSelect(section.number)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150',
                    isActive
                      ? 'bg-[#0F4C81] text-white shadow-sm'
                      : 'bg-gray-50 text-[#64748B] hover:bg-gray-100',
                  )}
                >
                  <span className="text-xs font-bold">{section.number}</span>
                  <span className="hidden text-xs font-medium sm:inline">
                    {section.title.length > 20
                      ? section.title.slice(0, 20) + '...'
                      : section.title}
                  </span>
                  {!isActive && (
                    <div className="ml-1">
                      {isSubmitted && section.colorStatus ? (
                        <StatusBadge status={section.colorStatus} size="sm" />
                      ) : (
                        <CompletionIcon status={section.completionStatus} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composite export
// ---------------------------------------------------------------------------

export function SectionNav(props: SectionNavProps) {
  return (
    <>
      <SectionNavMobile {...props} />
      <SectionNavDesktop {...props} />
    </>
  );
}
