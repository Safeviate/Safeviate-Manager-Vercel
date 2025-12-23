
'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { QualityAudit, CorrectiveActionPlan, QualityFinding, CorrectiveAction } from '@/types/quality';
import type { Personnel } from '../../users/personnel/page';
import { UpdateActionStatusDialog } from './cap-tracker/update-action-status-dialog';
import type { Department } from '../../admin/department/page';

export type EnrichedCorrectiveActionPlan = CorrectiveActionPlan & {
  auditNumber: string;
  findingDescription: string;
  findingLevel?: string;
  responsiblePersonName?: string;
};


export default function CapTracker() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedCap, setSelectedCap] = useState<EnrichedCorrectiveActionPlan | null>(null);

  const auditsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null),
    [firestore, tenantId]
  );
  const personnelQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );
  const departmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/departments`)) : null),
    [firestore, tenantId]
  );
   const capsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null),
    [firestore, tenantId]
  );

  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);

  const isLoading = isLoadingAudits || isLoadingPersonnel || isLoadingDepts || isLoadingCaps;

  const openCaps = useMemo((): EnrichedCorrectiveActionPlan[] => {
    if (!audits || !caps) return [];

    const openCapsList = caps.filter(cap => cap.status === 'Open');

    const auditsMap = new Map(audits.map(a => [a.id, a]));
    const usersMap = new Map([...(personnel || []), ...(departments || [])].map(p => [p.id, 'firstName' in p ? `${p.firstName} ${p.lastName}` : p.name]));

    return openCapsList.map(cap => {
      const audit = auditsMap.get(cap.auditId);
      const finding = audit?.findings.find(f => f.checklistItemId === cap.findingId);
      const checklistItem = audit?.template.sections.flatMap(s => s.items).find(i => i.id === cap.findingId);

      // Assuming a single action for now, this can be expanded.
      const action = cap.actions?.[0];

      return {
        ...cap,
        auditNumber: audit?.auditNumber || 'N/A',
        findingDescription: checklistItem?.text || 'Finding description not found.',
        findingLevel: finding?.level,
        responsiblePersonName: action ? usersMap.get(action.responsiblePersonId) : 'N/A',
      };
    });
  }, [audits, caps, personnel, departments]);

  const handleOpenUpdateDialog = (cap: EnrichedCorrectiveActionPlan) => {
    setSelectedCap(cap);
    setIsUpdateDialogOpen(true);
  };

  const handleCloseUpdateDialog = () => {
    setSelectedCap(null);
    setIsUpdateDialogOpen(false);
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Corrective Action Plan (CAP) Tracker</CardTitle>
          <CardDescription>A centralized list of all open corrective actions from all audits.</CardDescription>
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
                  <TableHead className="w-[40%]">Finding</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openCaps.length > 0 ? (
                  openCaps.map(cap => (
                    <TableRow key={cap.id}>
                      <TableCell className="font-medium">{cap.auditNumber}</TableCell>
                      <TableCell>{cap.findingDescription}</TableCell>
                      <TableCell><Badge variant={cap.findingLevel ? 'destructive' : 'outline'}>{cap.findingLevel || 'N/A'}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{cap.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenUpdateDialog(cap)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No open corrective actions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {selectedCap && (
        <UpdateActionStatusDialog 
            isOpen={isUpdateDialogOpen}
            onClose={handleCloseUpdateDialog}
            cap={selectedCap}
            tenantId={tenantId}
        />
      )}
    </>
  );
}
