
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
import { AircraftComponentsForm } from './aircraft-components-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentUploader } from '@/app/(app)/users/personnel/[id]/document-uploader';
import { format } from 'date-fns';
import { Upload } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Tracked Components</DialogTitle>
          <DialogDescription>
            Add, remove, or edit components for {aircraft.tailNumber}.
          </DialogDescription>
        </DialogHeader>
        <AircraftComponentsForm
          existingComponents={aircraft.components || []}
          onSave={(components) => {
            const firestore = getFirestore();
            const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
            updateDocumentNonBlocking(aircraftRef, { components });
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}


// Manage Documents Dialog
export function ManageDocumentsDialog({ aircraft, tenantId, isOpen, onOpenChange }: { aircraft: Aircraft; tenantId: string; isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const { toast } = useToast();
  const firestore = getFirestore();
  const [documents, setDocuments] = useState<Document[]>(aircraft.documents || []);

  const handleDocumentUpdate = (updatedDocuments: Document[]) => {
      setDocuments(updatedDocuments);
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
      updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };
  
  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
      const updatedDocs = [...documents, docDetails];
      handleDocumentUpdate(updatedDocs);
      toast({ title: 'Document Added', description: `"${docDetails.name}" has been added to the aircraft.`});
  };

  const handleDocumentDelete = (docNameToDelete: string) => {
      const updatedDocs = documents.filter(doc => doc.name !== docNameToDelete);
      handleDocumentUpdate(updatedDocs);
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
                        <Button onClick={openDialog}>
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
