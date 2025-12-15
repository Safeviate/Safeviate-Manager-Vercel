
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { type AircraftModelProfile } from './template-form';
import Link from 'next/link';
import { AssignProfileForm } from './assign-profile-form';
import type { Aircraft } from '../page';

export function TemplatesTab() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const profilesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircraftModelProfiles')) : null),
    [firestore, tenantId]
  );
  
  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );

  const { data: profiles, isLoading: isLoadingProfiles, error: profilesError } = useCollection<AircraftModelProfile>(profilesQuery);
  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);

  const isLoading = isLoadingProfiles || isLoadingAircraft;
  const error = profilesError || aircraftError;

  return (
    <div className="flex flex-col gap-6 h-full mt-4">
       <div className="flex justify-end">
          <AssignProfileForm 
            tenantId={tenantId}
            profiles={profiles || []}
            aircraftList={aircraft || []}
          />
        </div>
      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-center">Loading profiles...</p>}
          {error && <p className="p-4 text-center text-destructive">Error: {error.message}</p>}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Make</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles && profiles.length > 0 ? (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.make}</TableCell>
                      <TableCell>{profile.model}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                           <Link href={`/assets/mass-balance/${profile.id}/edit`}>Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No profiles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
