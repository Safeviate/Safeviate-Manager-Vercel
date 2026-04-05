
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PilotProfile } from '../personnel/page';
import { PersonnelActions } from '../personnel/personnel-actions';
import { ShieldAlert, Mail, GraduationCap, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface StudentsTableProps {
  data: PilotProfile[];
  tenantId: string;
}

export function StudentsTable({ data, tenantId }: StudentsTableProps) {
  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-foreground/80">
            No students found.
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
                  <TableHead className="text-[10px] uppercase font-bold">License No.</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((pilot) => (
                  <TableRow key={pilot.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-primary">{pilot.userNumber || '-'}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {pilot.firstName} {pilot.lastName}
                        <div className="flex gap-1">
                          {pilot.isErpIncerfaContact && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                              </TooltipTrigger>
                              <TooltipContent>Designated ERP INCERFA Contact</TooltipContent>
                            </Tooltip>
                          )}
                          {pilot.isErpAlerfaContact && (
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
                    <TableCell className="text-xs">{pilot.email}</TableCell>
                    <TableCell className="text-xs">{pilot.department || 'N/A'}</TableCell>
                    <TableCell className="text-xs font-semibold">{pilot.role || 'N/A'}</TableCell>
                    <TableCell className="text-xs font-mono font-bold uppercase">{pilot.pilotLicense?.licenseNumber || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <PersonnelActions tenantId={tenantId} user={pilot} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* --- MOBILE/TABLET CARD VIEW --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden pb-20">
            {data.map((pilot) => (
              <Card key={pilot.id} className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{pilot.userNumber || 'NO ID'}</span>
                    <span className="text-sm font-black mt-1">{pilot.firstName} {pilot.lastName}</span>
                  </div>
                  <div className="flex gap-1">
                    {pilot.isErpIncerfaContact && <ShieldAlert className="h-4 w-4 text-red-600" />}
                    {pilot.isErpAlerfaContact && <ShieldAlert className="h-4 w-4 text-amber-600" />}
                  </div>
                </CardHeader>
                <CardContent className="p-4 py-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {pilot.email}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      Student
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{pilot.pilotLicense?.licenseNumber || 'No License'}</span>
                  </div>
                  <div className="grid gap-1 text-[10px] uppercase font-black text-muted-foreground">
                    <span>Department: {pilot.department || 'N/A'}</span>
                    <span>Role: {pilot.role || 'N/A'}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-2 border-t bg-muted/5 flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 text-[10px] h-8">
                    <Link href={`/training/student-progress/${pilot.id}`}>
                      Progress
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="flex-1 justify-between text-[10px] font-bold h-8">
                    <Link href={`/users/personnel/${pilot.id}?type=${pilot.userType}`}>
                      Profile
                      <ArrowRight className="h-3 w-3" />
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
