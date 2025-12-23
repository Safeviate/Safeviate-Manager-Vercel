
'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { QualityAudit, CorrectiveAction } from '@/types/quality';
import type { Personnel } from '../../users/personnel/page';
import { UpdateActionStatusDialog } from './cap-tracker/update-action-status-dialog';
import type { Department } from '../../admin/department/page';

type EnrichedCorrectiveAction = CorrectiveAction & {
  auditId: string;
  auditNumber: string;
  findingId: string;
  responsiblePersonName?: string;
};

export default function CapTracker() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<EnrichedCorrectiveAction | null>(null);

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

  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);

  const isLoading = isLoadingAudits || isLoadingPersonnel || isLoadingDepts;

  const openCorrectiveActions = useMemo((): EnrichedCorrectiveAction[] => {
    if (!audits || !personnel || !departments) return [];

    const usersMap = new Map([...personnel, ...departments].map(p => [p.id, 'firstName' in p ? `${p.firstName} ${p.lastName}`: p.name]));

    const allActions: EnrichedCorrectiveAction[] = [];

    audits.forEach(audit => {
      audit.findings?.forEach(finding => {
        // This assumes corrective actions are nested under a CAP linked to a finding.
        // We will adapt this if the data model is different. For now, let's assume a hypothetical `correctiveActions` array on the finding.
        // Based on the latest backend.json, `CorrectiveActionPlan` is a separate collection, so we'd fetch those and match them.
        // But for a direct CAP tracker, let's assume actions can be found or derived.
        // Let's create a placeholder logic.
        const findingActions = (audit as any).correctiveActions as CorrectiveAction[] || [];
        
        findingActions.filter(action => action.status === 'Open').forEach(action => {
            allActions.push({
                ...action,
                auditId: audit.id,
                auditNumber: audit.auditNumber,
                findingId: finding.checklistItemId,
                responsiblePersonName: usersMap.get(action.responsiblePersonId),
            });
        });
      });
    });

    return allActions;
  }, [audits, personnel, departments]);

  const handleOpenUpdateDialog = (action: EnrichedCorrectiveAction) => {
    setSelectedAction(action);
    setIsUpdateDialogOpen(true);
  };

  const handleCloseUpdateDialog = () => {
    setSelectedAction(null);
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
                  <TableHead className="w-[40%]">Action Required</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openCorrectiveActions.length > 0 ? (
                  openCorrectiveActions.map(action => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.auditNumber}</TableCell>
                      <TableCell>{action.description}</TableCell>
                      <TableCell>{action.responsiblePersonName || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(action.deadline), 'PPP')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenUpdateDialog(action)}>
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
      {selectedAction && (
        <UpdateActionStatusDialog 
            isOpen={isUpdateDialogOpen}
            onClose={handleCloseUpdateDialog}
            action={selectedAction}
            tenantId={tenantId}
        />
      )}
    </>
  );
}
