'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { PilotProfile, Personnel } from '../personnel/page';
import { PersonnelActions } from '../personnel/personnel-actions';
import { ShieldAlert, Mail, Building2, UserCog, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      <div className="text-center h-24 flex items-center justify-center text-muted-foreground italic">
        No external users found.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* --- DESKTOP VIEW --- */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-bold">User #</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Name</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Email</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Organization</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Role</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">User Type</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-primary">{user.userNumber || '-'}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.firstName} {user.lastName}
                      <div className="flex gap-1">
                        {user.isErpIncerfaContact && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                            </TooltipTrigger>
                            <TooltipContent>Designated ERP INCERFA Contact</TooltipContent>
                          </Tooltip>
                        )}
                        {user.isErpAlerfaContact && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                            </TooltipTrigger>
                            <TooltipContent>Designated ERP ALERFA Contact</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {orgMap.get(user.organizationId || '') || 'Unknown Org'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{rolesMap.get(user.role) || user.role}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[9px] uppercase font-black">{user.userType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <PersonnelActions tenantId={tenantId} user={user} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* --- MOBILE VIEW --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden p-4">
          {data.map((user) => (
            <Card key={user.id} className="shadow-none border-slate-200 overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">{user.userNumber || 'EXT-USR'}</span>
                  <span className="text-sm font-black mt-1">{user.firstName} {user.lastName}</span>
                </div>
                <div className="flex gap-1">
                  {user.isErpIncerfaContact && <ShieldAlert className="h-4 w-4 text-red-600" />}
                  {user.isErpAlerfaContact && <ShieldAlert className="h-4 w-4 text-amber-600" />}
                </div>
              </CardHeader>
              <CardContent className="p-4 py-3 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {user.email}
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {orgMap.get(user.organizationId || '') || 'No Org'}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase">
                  <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                  {rolesMap.get(user.role) || user.role} • {user.userType}
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t bg-muted/5">
                <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold h-8">
                  <Link href={`/users/personnel/${user.id}?type=${user.userType}`}>
                    View Profile
                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
