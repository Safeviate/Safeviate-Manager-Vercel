'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PilotProfile, Personnel } from '../personnel/page';
import { PersonnelActions } from '../personnel/personnel-actions';
import { ShieldAlert, Mail, Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';

type UserProfile = Personnel | PilotProfile;

interface ExternalUsersTableProps {
  data: UserProfile[];
  orgMap: Map<string, string>;
  rolesMap: Map<string, string>;
  tenantId: string;
}

export function ExternalUsersTable({ data, orgMap, rolesMap, tenantId }: ExternalUsersTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center h-24 flex items-center justify-center text-foreground/80 italic uppercase font-bold tracking-widest bg-muted/5">
        No external users found.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ResponsiveCardGrid
        items={data}
        isLoading={false}
        className="p-4"
        gridClassName="sm:grid-cols-2 xl:grid-cols-3"
        renderItem={(user) => (
          <Card key={user.id} className="overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-[10px] font-black uppercase tracking-widest text-primary">
                  {user.userNumber || 'EXT-USR'}
                </p>
                <p className="truncate text-sm font-black text-foreground">
                  {user.firstName} {user.lastName}
                </p>
              </div>
              <div className="flex gap-1">
                {user.isErpIncerfaContact && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                    </TooltipTrigger>
                    <TooltipContent>Designated ERP INCERFA Contact</TooltipContent>
                  </Tooltip>
                )}
                {user.isErpAlerfaContact && (
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
                    {user.email}
                  </p>
                </div>
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Role</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{rolesMap.get(user.role) || user.role}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Organization</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {orgMap.get(user.organizationId || '') || 'Unknown Org'}
                  </p>
                </div>
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">User Type</p>
                  <Badge variant="secondary" className="mt-1 text-[10px] font-black uppercase py-0.5 px-2">
                    {user.userType}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-end">
                <PersonnelActions tenantId={tenantId} user={user} />
              </div>
            </CardContent>
          </Card>
        )}
        emptyState={(
          <div className="text-center h-24 flex items-center justify-center text-foreground/80 italic uppercase font-bold tracking-widest bg-muted/5">
            No external users found.
          </div>
        )}
      />
    </TooltipProvider>
  );
}
