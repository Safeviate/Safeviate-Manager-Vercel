
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PersonnelForm } from './personnel/personnel-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Role } from '../admin/roles/page';
import type { Department } from '../admin/department/page';
import type { Personnel, PilotProfile } from './personnel/page';
import { PersonnelTable } from './personnel/personnel-table';
import { PilotsTable } from './pilots/pilots-table';

export default function UsersPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  // --- Data Fetching ---
  const personnelQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'personnel')) : null),
    [firestore, tenantId]
  );
  const pilotsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'pilots')) : null),
    [firestore, tenantId]
  );
  const rolesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'roles')) : null),
    [firestore, tenantId]
  );
  const departmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'departments')) : null),
    [firestore, tenantId]
  );

  const { data: personnel, isLoading: isLoadingPersonnel, error: personnelError } = useCollection<Personnel>(personnelQuery);
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);
  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
  const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);

  const isLoading = isLoadingPersonnel || isLoadingPilots || isLoadingRoles || isLoadingDepts;
  const error = personnelError || pilotsError || rolesError || deptsError;

  // --- Data Filtering ---
  const students = useMemo(() => pilots?.filter(p => p.userType === 'Student') || [], [pilots]);
  const privatePilots = useMemo(() => pilots?.filter(p => p.userType === 'Private Pilot') || [], [pilots]);
  const instructors = useMemo(() => pilots?.filter(p => p.userType === 'Instructor') || [], [pilots]);
  
  // --- Mappers ---
  const rolesMap = useMemo(() => {
    if (!roles) return new Map<string, string>();
    return new Map(roles.map(role => [role.id, role.name]));
  }, [roles]);

  const departmentsMap = useMemo(() => {
    if (!departments) return new Map<string, string>();
    return new Map(departments.map(dept => [dept.id, dept.name]));
  }, [departments]);
  
  const sections = [
    { 
      title: "Personnel", 
      data: personnel, 
      component: <PersonnelTable data={personnel || []} rolesMap={rolesMap} departmentsMap={departmentsMap} tenantId={tenantId} /> 
    },
    { 
      title: "Instructors", 
      data: instructors, 
      component: <PilotsTable data={instructors} tenantId={tenantId} /> 
    },
    { 
      title: "Private Pilots", 
      data: privatePilots, 
      component: <PilotsTable data={privatePilots} tenantId={tenantId} /> 
    },
    { 
      title: "Students", 
      data: students, 
      component: <PilotsTable data={students} tenantId={tenantId} /> 
    },
  ];


  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-end">
            <PersonnelForm tenantId={tenantId} roles={roles || []} departments={departments || []} />
        </div>

        <Card>
            <CardContent className="p-0">
                 <Accordion type="multiple" defaultValue={['Personnel', 'Instructors', 'Private Pilots', 'Students']} className="w-full">
                    {sections.map(section => (
                        <AccordionItem value={section.title} key={section.title}>
                            <AccordionTrigger className="px-6 text-lg font-medium hover:no-underline">
                                <div className="flex items-center gap-2">
                                  {section.title}
                                  <span className="text-sm font-normal text-muted-foreground">({section.data?.length || 0})</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                {isLoading && <p className='px-6'>Loading...</p>}
                                {!isLoading && error && <p className='px-6 text-destructive'>Error: {error.message}</p>}
                                {!isLoading && !error && (
                                    <div className="border-t">
                                        {section.component}
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    </div>
  );
}
