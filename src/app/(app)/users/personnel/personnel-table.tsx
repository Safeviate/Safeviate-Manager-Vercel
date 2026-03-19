
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
import type { Personnel } from './page';
import { PersonnelActions } from './personnel-actions';
import { ShieldAlert, Mail, User as UserIcon, Building2, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PersonnelTableProps {
  data: Personnel[];
  rolesMap: Map<string, string>;
  departmentsMap: Map<string, string>;
  tenantId: string;
}

export function PersonnelTable({ data, rolesMap, departmentsMap, tenantId }: PersonnelTableProps) {
  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No personnel found.
        </div>
    );
  }
  
  return (
    <TooltipProvider>
      <ScrollArea className="h-full">
        <div className="p-4 md:p-6">
          {/* --- DESKTOP TABLE VIEW --- */}
          <div className="hidden lg:block rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold">User #</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Name</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Email</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Department</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Role</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((person) => (
                  <TableRow key={person.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-primary">{person.userNumber || '-'}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {person.firstName} {person.lastName}
                        <div className="flex gap-1">
                          {person.isErpIncerfaContact && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                              </TooltipTrigger>
                              <TooltipContent>Designated ERP INCERFA Contact</TooltipContent>
                            </Tooltip>
                          )}
                          {person.isErpAlerfaContact && (
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
                    <TableCell className="text-xs">{person.email}</TableCell>
                    <TableCell className="text-xs">{departmentsMap.get(person.department || '') || 'N/A'}</TableCell>
                    <TableCell className="text-xs font-semibold">{rolesMap.get(person.role) || person.role}</TableCell>
                    <TableCell className="text-right">
                      <PersonnelActions tenantId={tenantId} user={person} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* --- MOBILE/TABLET CARD VIEW --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden pb-20">
            {data.map((person) => (
              <Card key={person.id} className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{person.userNumber || 'NO ID'}</span>
                    <span className="text-sm font-black mt-1">{person.firstName} {person.lastName}</span>
                  </div>
                  <div className="flex gap-1">
                    {person.isErpIncerfaContact && <ShieldAlert className="h-4 w-4 text-red-600" />}
                    {person.isErpAlerfaContact && <ShieldAlert className="h-4 w-4 text-amber-600" />}
                  </div>
                </CardHeader>
                <CardContent className="p-4 py-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {person.email}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {departmentsMap.get(person.department || '') || 'No Dept'} • {rolesMap.get(person.role) || person.role}
                  </div>
                </CardContent>
                <CardFooter className="p-2 border-t bg-muted/5">
                  <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold h-8">
                    <Link href={`/users/personnel/${person.id}?type=${person.userType}`}>
                      View Profile
                      <ArrowRight className="h-3.5 w-3.5 ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
