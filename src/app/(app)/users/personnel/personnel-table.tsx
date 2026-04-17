'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Mail, ShieldAlert } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Personnel } from './personnel-directory-page';
import { PersonnelActions } from './personnel-actions';

interface PersonnelTableProps {
  data: Personnel[];
  rolesMap: Map<string, string>;
  departmentsMap: Map<string, string>;
  tenantId: string;
}

export function PersonnelTable({ data, rolesMap, departmentsMap, tenantId }: PersonnelTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-center text-foreground/80">
        No personnel found.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea className="h-full">
        <div className="hidden lg:block">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-8">
                <TableHead className="text-[10px] font-bold uppercase">User #</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Email</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Department</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Role</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((person) => (
                <TableRow key={person.id} className="group h-10">
                  <TableCell className="px-3 py-2 font-mono text-sm font-medium text-primary">
                    {person.userNumber || '-'}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm font-medium text-foreground">
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
                  <TableCell className="px-3 py-2 text-sm font-medium text-foreground">{person.email}</TableCell>
                  <TableCell className="px-3 py-2 text-sm font-medium text-foreground">
                    {departmentsMap.get(person.department || '') || 'N/A'}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm font-medium text-foreground">
                    {rolesMap.get(person.role) || person.role}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    <PersonnelActions tenantId={tenantId} user={person} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 lg:hidden">
          {data.map((person) => (
            <Card key={person.id} className="overflow-hidden border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/5 p-4 pb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {person.userNumber || 'NO ID'}
                  </span>
                  <span className="mt-1 text-sm font-black">
                    {person.firstName} {person.lastName}
                  </span>
                </div>
                <div className="flex gap-1">
                  {person.isErpIncerfaContact && <ShieldAlert className="h-4 w-4 text-red-600" />}
                  {person.isErpAlerfaContact && <ShieldAlert className="h-4 w-4 text-amber-600" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {person.email}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {departmentsMap.get(person.department || '') || 'No Dept'} • {rolesMap.get(person.role) || person.role}
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/5 p-2">
                <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-between text-xs font-bold">
                  <Link href={`/users/personnel/${person.id}?type=${person.userType}`}>
                    View Profile
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
