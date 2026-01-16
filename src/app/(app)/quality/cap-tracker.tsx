

'use client';

import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { QualityAudit, CorrectiveActionPlan } from '@/types/quality';
import Link from 'next/link';
import { format } from 'date-fns';

type EnrichedAudit = QualityAudit & {
  nonCompliantFindings: number;
  openCapActions: number;
};


export default function CapTracker() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const auditsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null),
    [firestore, tenantId]
  );
  
  const capsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null),
    [firestore, tenantId]
  );

  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);

  const isLoading = isLoadingAudits || isLoadingCaps;

  const auditsWithCaps = useMemo((): EnrichedAudit[] => {
    if (!audits || !caps) return [];

    const capsByAuditId = caps.reduce((acc, cap) => {
        if (!acc[cap.auditId]) {
            acc[cap.auditId] = [];
        }
        acc[cap.auditId].push(cap);
        return acc;
    }, {} as Record<string, CorrectiveActionPlan[]>);

    return audits
        .filter(audit => audit.findings?.some(f => f.finding === 'Non Compliant'))
        .map(audit => {
            const nonCompliantFindings = audit.findings?.filter(f => f.finding === 'Non Compliant').length || 0;
            const relatedCaps = capsByAuditId[audit.id] || [];
            const openCapActions = relatedCaps.reduce((total, cap) => {
                const openActions = cap.actions?.filter(action => action.status === 'Open' || action.status === 'In Progress').length || 0;
                return total + openActions;
            }, 0);

            return {
                ...audit,
                nonCompliantFindings,
                openCapActions,
            };
        })
        .filter(audit => audit.nonCompliantFindings > 0); // Only show audits that actually have non-compliant findings

  }, [audits, caps]);
  
  return (
    <Card>
        <CardHeader>
          <CardTitle>Corrective Action Plan (CAP) Tracker</CardTitle>
          <CardDescription>A summary of all audits with open findings requiring corrective action.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit ID</TableHead>
                  <TableHead className="w-[40%]">Audit Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Open Actions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditsWithCaps.length > 0 ? (
                  auditsWithCaps.map(audit => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">{audit.auditNumber}</TableCell>
                      <TableCell>{audit.title}</TableCell>
                      <TableCell>{format(new Date(audit.auditDate), 'PPP')}</TableCell>
                      <TableCell>
                          <Badge variant="destructive">{audit.nonCompliantFindings}</Badge>
                      </TableCell>
                       <TableCell>
                          <Badge variant={audit.openCapActions > 0 ? 'secondary' : 'default'}>{audit.openCapActions}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/quality/audits/${audit.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Manage
                            </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No audits with open corrective actions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
  );
}
