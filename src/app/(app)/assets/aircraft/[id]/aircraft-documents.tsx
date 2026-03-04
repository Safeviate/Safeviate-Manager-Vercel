
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Trash2, FileUp } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';
import { format } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from '@/components/document-uploader';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

interface AircraftDocumentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftDocuments({ aircraft, tenantId }: AircraftDocumentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  const onUpload = async (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const updatedDocs = [...(aircraft.documents || []), docDetails];
    await updateDoc(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document uploaded' });
  };

  const onDelete = async (name: string) => {
    if (!firestore || !window.confirm('Delete this document?')) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== name);
    await updateDoc(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Aircraft Documents</h3>
        <DocumentUploader onDocumentUploaded={onUpload} trigger={(open) => (
          <Button size="sm" onClick={() => open()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        )} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.documents || []).length > 0 ? (
              aircraft.documents?.map((d) => (
                <TableRow key={d.name}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{format(new Date(d.uploadDate), 'PPP')}</TableCell>
                  <TableCell>{d.expirationDate ? format(new Date(d.expirationDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setViewingUrl(d.url)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(d.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No documents in vault.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingUrl && (
            <div className="relative h-[70vh]">
              <Image src={viewingUrl} alt="Document" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
