
'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { MassBalanceTemplateForm, type AircraftModelProfile } from './template-form';

export default function MassBalanceTemplatesPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AircraftModelProfile | null>(null);

  const profilesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircraftModelProfiles')) : null),
    [firestore, tenantId]
  );

  const { data: profiles, isLoading, error } = useCollection<AircraftModelProfile>(profilesQuery);

  const handleOpenForm = (profile?: AircraftModelProfile) => {
    setSelectedProfile(profile || null);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedProfile(null);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Mass & Balance Templates</h1>
            <p className="text-muted-foreground">Manage reusable Weight & Balance profiles for your aircraft models.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-center">Loading templates...</p>}
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
                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(profile)}>
                           Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No templates found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <MassBalanceTemplateForm
            tenantId={tenantId}
            initialData={selectedProfile}
            isOpen={isFormOpen}
            onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
