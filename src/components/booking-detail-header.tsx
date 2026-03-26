'use client';

import { Clock, FileText, Map as NavIcon } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';

type BookingDetailHeaderProps = {
  title: string;
  subtitle: string;
  status?: string | null;
  flightHours?: string | null;
  activeTab: string;
  onTabChange: (value: string) => void;
};

export function BookingDetailHeader({
  title,
  subtitle,
  status,
  flightHours,
  activeTab,
  onTabChange,
}: BookingDetailHeaderProps) {
  return (
    <Card className="shrink-0 overflow-hidden border shadow-none">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {title}
              {status ? (
                <Badge variant={status === 'Approved' ? 'default' : 'secondary'}>
                  {status}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          {flightHours ? (
            <div className="text-right">
              <p className="text-[10px] font-black uppercase">Flight Time</p>
              <p className="flex items-center justify-end gap-2 text-3xl font-black text-primary">
                <Clock className="h-6 w-6" />
                {flightHours}h
              </p>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <ResponsiveTabRow
        value={activeTab}
        onValueChange={onTabChange}
        placeholder="Select Section"
        className="border-b-0 bg-background/95 px-4 py-3"
        options={[
          { value: 'flight-details', label: 'Flight Details', icon: FileText },
          { value: 'navlog', label: 'Navlog', icon: NavIcon },
        ]}
      />
    </Card>
  );
}
