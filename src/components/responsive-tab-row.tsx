'use client';

import type { ReactNode } from 'react';
import { Building, type LucideIcon } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
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
  action?: ReactNode;
  joinedDesktopTabs?: boolean;
};

export function ResponsiveTabRow({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  action,
  joinedDesktopTabs = false,
}: ResponsiveTabRowProps) {
  const isMobile = useIsMobile();

  return (
    <div className={className || 'border-b bg-muted/5 px-4 py-3 shrink-0'}>
      {isMobile ? (
        <div className="space-y-2">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger aria-label={placeholder} className="w-full justify-between border-input bg-background text-foreground text-[10px] font-bold uppercase h-9 px-3 shadow-sm hover:bg-accent/40">
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
          {action ? <div className="flex justify-end">{action}</div> : null}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <TabsList className={cn(
            "bg-transparent h-auto p-0 border-b-0 justify-start overflow-x-auto no-scrollbar flex items-center",
            joinedDesktopTabs ? "gap-0 !rounded-none border border-input overflow-hidden" : "gap-2"
          )}>
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground font-black text-[10px] uppercase transition-all shrink-0",
                    joinedDesktopTabs
                      ? "!rounded-none border-0 border-r border-input last:border-r-0 data-[state=active]:rounded-none"
                      : "rounded-full"
                  )}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                  {option.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {action}
        </div>
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
