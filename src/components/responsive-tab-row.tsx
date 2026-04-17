'use client';

import type { ReactNode } from 'react';
import { Building, type LucideIcon } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { HEADER_TAB_LIST_CLASS, HEADER_TAB_TRIGGER_CLASS } from '@/components/page-header';
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
  leadingAction?: ReactNode;
  action?: ReactNode;
  joinedDesktopTabs?: boolean;
  flatTabs?: boolean;
  buttonLikeTabs?: boolean;
  centerTabs?: boolean;
};

export function ResponsiveTabRow({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  leadingAction,
  action,
  joinedDesktopTabs = false,
  flatTabs = false,
  buttonLikeTabs = false,
  centerTabs = false,
}: ResponsiveTabRowProps) {
  const isMobile = useIsMobile();

  return (
    <div className={className || 'border-b bg-muted/5 px-3 py-2 shrink-0'}>
      {isMobile ? (
        <div className="space-y-1.5">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger aria-label={placeholder} className="w-full justify-between border-input bg-background text-foreground h-8 px-3 py-1.5 text-[10px] font-medium shadow-sm hover:bg-accent/40">
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
        <div className={cn("flex items-center gap-3", leadingAction || action ? "justify-between" : centerTabs ? "justify-center" : "justify-between")}>
          {leadingAction ? <div className="shrink-0">{leadingAction}</div> : null}
          <TabsList className={cn(
            flatTabs ? "bg-transparent border-0 shadow-none p-0 gap-2 overflow-x-auto no-scrollbar flex items-center" : `${HEADER_TAB_LIST_CLASS} bg-transparent border-b-0 overflow-x-auto no-scrollbar flex items-center`,
            joinedDesktopTabs ? "gap-0 !rounded-none border border-input overflow-hidden" : "gap-1.5"
            ,
            centerTabs ? "justify-center mx-auto" : "justify-start"
          )}>
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className={cn(
                    buttonLikeTabs
                      ? "h-8 rounded-md border border-input bg-background px-3 py-1.5 text-[10px] font-medium shadow-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      : flatTabs
                        ? "rounded-md border border-input bg-transparent px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        : `${HEADER_TAB_TRIGGER_CLASS} border bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none`,
                    joinedDesktopTabs && !flatTabs
                      ? "!rounded-none border-0 border-r border-input last:border-r-0 data-[state=active]:rounded-none"
                      : flatTabs
                        ? "shadow-none data-[state=active]:shadow-none"
                        : "rounded-md shadow-none data-[state=active]:shadow-none"
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
  flatTabs?: boolean;
  buttonLikeTabs?: boolean;
  centerTabs?: boolean;
};

export function OrganizationTabsRow({
  organizations,
  activeTab,
  onTabChange,
  className,
  flatTabs = false,
  buttonLikeTabs = false,
  centerTabs = false,
}: OrganizationTabsRowProps) {
  return (
    <ResponsiveTabRow
      value={activeTab}
      onValueChange={onTabChange}
      placeholder="Select Organization"
      className={className}
      flatTabs={flatTabs}
      buttonLikeTabs={buttonLikeTabs}
      centerTabs={centerTabs}
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
