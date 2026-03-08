
'use client';

import { useMemo, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Trash2, Upload, View, PlusCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

interface AircraftDocumentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftDocuments({ aircraft, tenantId }: AircraftDocumentsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);
    if (daysUntilExpiry < 0) return expirySettings.expiredColor || '#ef4444';
    const sortedPeriods = (expirySettings.warningPeriods || []).sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) return warning.color;
    }
    return expirySettings.defaultColor || null;
  };

  const handleDocumentUpdate = (updatedDocuments: any[]) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: any) => {
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    handleDocumentUpdate(updatedDocs);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft.documents || [];
    const updatedDocs = currentDocs.map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    handleDocumentUpdate(updatedDocs);
  };

  const handleDocumentDelete = (docNameToDelete: string) => {
    const updatedDocs = (aircraft.documents || []).filter(doc => doc.name !== docNameToDelete);
    handleDocumentUpdate(updatedDocs);
    toast({ title: "Document Deleted" });
  };

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Required & Uploaded Documents</CardTitle>
          <CardDescription>View and manage airworthiness and insurance documentation.</CardDescription>
        </div>
        <DocumentUploader
          onDocumentUploaded={onDocumentUploaded}
          trigger={(open) => (
            <Button size="sm" onClick={() => open()} className="bg-sky-400 hover:bg-sky-500 text-white border-none shadow-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Document
            </Button>
          )}
        />
      </CardHeader>
      <CardContent>
        {aircraft.documents && aircraft.documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-center">Set Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft.documents.map((doc) => {
                const statusColor = getStatusColor(doc.expirationDate);
                return (
                  <TableRow key={doc.name}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusColor && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor }} />}
                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'MMMM do, yyyy') : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CustomCalendar
                            selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                            onDateSelect={(date) => handleExpirationDateChange(doc.name, date)}
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setViewingImageUrl(doc.url)}>
                          <View className="mr-2 h-4 w-4" /> View
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.name)} className="bg-red-500 hover:bg-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            No documents uploaded for this aircraft.
          </div>
        )}
      </CardContent>
      <Dialog open={!!viewingImageUrl} onOpenChange={() => setViewingImageUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[80vh]">
              <Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }} unoptimized />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
