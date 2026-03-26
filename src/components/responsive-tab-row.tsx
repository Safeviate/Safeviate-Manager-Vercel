'use client';

import { Building, type LucideIcon } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

type ResponsiveTabOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
};

type ResponsiveTabRowProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ResponsiveTabOption[];
  placeholder: string;
  className?: string;
};

export function ResponsiveTabRow({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: ResponsiveTabRowProps) {
  const isMobile = useIsMobile();

  return (
    <div className={className || 'border-b bg-muted/5 px-4 py-3 shrink-0'}>
      {isMobile ? (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full justify-between bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase h-9 px-3 shadow-sm">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-[10px] font-bold uppercase"
                >
                  <div className="flex items-center gap-2">
                    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                    {option.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : (
        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground font-black text-[10px] uppercase transition-all shrink-0"
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {option.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      )}
    </div>
  );
}

type OrganizationTabsRowProps = {
  organizations: { id: string; name: string }[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
};

export function OrganizationTabsRow({
  organizations,
  activeTab,
  onTabChange,
  className,
}: OrganizationTabsRowProps) {
  return (
    <ResponsiveTabRow
      value={activeTab}
      onValueChange={onTabChange}
      placeholder="Select Organization"
      className={className}
      options={[
        { value: 'internal', label: 'Internal', icon: Building },
        ...organizations.map((organization) => ({
          value: organization.id,
          label: organization.name,
          icon: Building,
        })),
      ]}
    />
  );
}
