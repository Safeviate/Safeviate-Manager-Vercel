'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AircraftForm } from '../aircraft-form';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentUploader } from '@/components/document-uploader';
import { format } from 'date-fns';
import { PlusCircle, Trash2, Upload } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

type Document = NonNullable<Aircraft['documents']>[0];


// Edit Details Dialog
export function EditAircraftDetailsDialog({ aircraft, tenantId, isOpen, onOpenChange }: { aircraft: Aircraft; tenantId: string; isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <AircraftForm
          tenantId={tenantId}
          existingAircraft={aircraft}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Manage Components Dialog
export function ManageComponentsDialog({ aircraft, tenantId, isOpen, onOpenChange }: { aircraft: Aircraft; tenantId: string; isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [components, setComponents] = useState<AircraftComponent[]>(aircraft.components || []);

  const handleAddComponent = async () => {
    if (!firestore) return;

    const nextComponents = [
      ...components,
      {
        id: crypto.randomUUID(),
        manufacturer: '',
        name: 'New Component',
        partNumber: '',
        serialNumber: '',
        installDate: new Date().toISOString(),
        installHours: 0,
        maxHours: 0,
        notes: '',
        tsn: 0,
        tso: 0,
        totalTime: 0,
      },
    ];

    try {
      await updateDoc(doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id), { components: nextComponents });
      setComponents(nextComponents);
      toast({ title: 'Component Added' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to add this component.',
      });
    }
  };

  const handleRemoveComponent = async (componentId: string) => {
    if (!firestore) return;

    const nextComponents = components.filter((component) => component.id !== componentId);

    try {
      await updateDoc(doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id), { components: nextComponents });
      setComponents(nextComponents);
      toast({ title: 'Component Removed' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to remove this component.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Tracked Components</DialogTitle>
          <DialogDescription>
            Add, remove, or edit components for {aircraft.tailNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-end">
            <Button onClick={handleAddComponent}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Install Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length > 0 ? components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                  <TableCell>{component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveComponent(component.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">No tracked components.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// Manage Documents Dialog
export function ManageDocumentsDialog({ aircraft, tenantId, isOpen, onOpenChange }: { aircraft: Aircraft; tenantId: string; isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [documents, setDocuments] = useState<Document[]>(aircraft.documents || []);

  const handleDocumentUpdate = async (updatedDocuments: Document[]) => {
      if (!firestore) return;
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);

      try {
        await updateDoc(aircraftRef, { documents: updatedDocuments });
        setDocuments(updatedDocuments);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: error instanceof Error ? error.message : 'Unable to update aircraft documents.',
        });
      }
  };
  
  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
      const updatedDocs = [...documents, docDetails];
      void handleDocumentUpdate(updatedDocs);
      toast({ title: 'Document Added', description: `"${docDetails.name}" has been added to the aircraft.`});
  };

  const handleDocumentDelete = (docNameToDelete: string) => {
      const updatedDocs = documents.filter(doc => doc.name !== docNameToDelete);
      void handleDocumentUpdate(updatedDocs);
      toast({ title: 'Document Removed', description: `"${docNameToDelete}" has been removed.`});
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Aircraft Documents</DialogTitle>
          <DialogDescription>
            Add or remove documents for {aircraft.tailNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="flex justify-end">
                <DocumentUploader
                    onDocumentUploaded={onDocumentUploaded}
                    trigger={(openDialog) => (
                        <Button onClick={() => openDialog()}>
                            <Upload className="mr-2 h-4 w-4" /> Add Document
                        </Button>
                    )}
                />
            </div>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Date Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map(doc => (
                        <TableRow key={doc.name}>
                            <TableCell>{doc.name}</TableCell>
                            <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="destructive" size="sm" onClick={() => handleDocumentDelete(doc.name)}>Delete</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {documents.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-24">No documents uploaded.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
