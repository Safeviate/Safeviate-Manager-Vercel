
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import type { PilotProfile } from '../personnel/page';
import { PrivatePilotsTable } from './private-pilots-table';
import { PersonnelForm } from '../personnel/personnel-form';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import type { LogbookTemplate } from '@/app/(app)/development/logbook-parser/page';

export default function PrivatePilotsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const pilotsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'pilots'), where('userType', '==', 'Private Pilot'))
        : null,
    [firestore]
  );
  
  const rolesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'roles'))
        : null,
    [firestore]
  );

  const departmentsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'departments'))
        : null,
    [firestore]
  );
  
  const logbookTemplatesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/logbook-templates`) : null),
    [firestore, tenantId]
  );

  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);
  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
  const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);
  const { data: logbookTemplates, isLoading: isLoadingTemplates } = useCollection<LogbookTemplate>(logbookTemplatesQuery);


  const isLoading = isLoadingPilots || isLoadingRoles || isLoadingDepts || isLoadingTemplates;
  const error = pilotsError || rolesError || deptsError;

  return (
    <div className="flex flex-col gap-6 h-full">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Private Pilots</h1>
                <p className="text-muted-foreground">Manage all private pilots in your organization.</p>
            </div>
            <PersonnelForm tenantId={tenantId} roles={roles || []} departments={departments || []} logbookTemplates={logbookTemplates || []} />
        </div>
      <Card>
        <CardContent className="p-0">
           {isLoading && (
              <div className="text-center p-4">Loading private pilots...</div>
            )}
            {!isLoading && error && (
              <div className="text-center p-4 text-destructive">Error: {error.message}</div>
            )}
            {!isLoading && !error && pilots && (
              <PrivatePilotsTable data={pilots} tenantId={tenantId} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
