'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Mail, CreditCard } from 'lucide-react';
import type { PilotProfile } from '../personnel/page';
import { PersonnelActions } from '../personnel/personnel-actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';

interface PilotsTableProps {
  data: PilotProfile[];
  tenantId: string;
}

export function PilotsTable({ data, tenantId }: PilotsTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center h-24 flex items-center justify-center text-foreground/80">
        No users found in this section.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ResponsiveCardGrid
        items={data}
        isLoading={false}
        className="p-4 pb-20"
        gridClassName="sm:grid-cols-2 xl:grid-cols-3"
        renderItem={(pilot) => (
          <Card key={pilot.id} className="overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-[10px] font-black uppercase tracking-widest text-primary">
                  {pilot.userNumber || '-'}
                </p>
                <p className="truncate text-sm font-black text-foreground">
                  {pilot.firstName} {pilot.lastName}
                </p>
              </div>
              <div className="flex gap-1">
                {pilot.isErpIncerfaContact && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                    </TooltipTrigger>
                    <TooltipContent>Designated ERP INCERFA Contact</TooltipContent>
                  </Tooltip>
                )}
                {pilot.isErpAlerfaContact && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                    </TooltipTrigger>
                    <TooltipContent>Designated ERP ALERFA Contact</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Email</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {pilot.email}
                  </p>
                </div>
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">License</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold uppercase text-foreground">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    {pilot.pilotLicense?.licenseNumber || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <PersonnelActions tenantId={tenantId} user={pilot} />
              </div>
            </CardContent>
          </Card>
        )}
        emptyState={(
          <div className="text-center h-24 flex items-center justify-center text-foreground/80">
            No users found in this section.
          </div>
        )}
      />
    </TooltipProvider>
  );
}
