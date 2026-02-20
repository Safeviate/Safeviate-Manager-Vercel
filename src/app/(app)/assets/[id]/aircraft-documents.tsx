'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, View, FileUp, Camera, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format, differenceInDays } from 'date-fns';
import { DocumentUploader } from './document-uploader';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc, type Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { DocumentExpirySettings } from '../../admin/document-dates/page';
import type { Aircraft } from '../page';
import type { Role } from '../../admin/roles/page';
import { Skeleton } from '@/components/ui/skeleton';

type Document = NonNullable<Aircraft['documents']>[0];

interface AircraftDocumentsProps {
  aircraftId: string;
  tenantId: string;
}

export function AircraftDocuments({ aircraftId, tenantId }: AircraftDocumentsProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft, error } = useDoc<Aircraft>(aircraftRef);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings, isLoading: isLoadingExpiry } = useDoc<DocumentExpirySettings>(expirySettingsRef);


  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry < 0) {
      return expirySettings.expiredColor || '#ef4444'; // Expired
    }
    const sortedPeriods = [...expirySettings.warningPeriods].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) {
        return warning.color;
      }
    }
    return expirySettings.defaultColor || null; // Safe color
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
  const handleDocumentUpdate = (updatedDocuments: Document[]) => {
    if (!firestore || !tenantId || !aircraft) return;
    const userRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(userRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = aircraft?.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    handleDocumentUpdate(updatedDocs);
    toast({ title: 'Document Uploaded', description: `"${docDetails.name}" has been uploaded.` });
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft?.documents || [];
    const docIndex = currentDocs.findIndex(d => d.name === docName);
    if (docIndex > -1) {
        const updatedDocs = [...currentDocs];
        updatedDocs[docIndex].expirationDate = date ? date.toISOString() : null;
        handleDocumentUpdate(updatedDocs);
    }
  };

  const handleDocumentDelete = (docNameToDelete: string) => {
    const currentDocs = aircraft?.documents || [];
    const updatedDocs = currentDocs.filter(doc => doc.name !== docNameToDelete);
    handleDocumentUpdate(updatedDocs);
    toast({ title: "Document Deleted", description: `"${docNameToDelete}" has been removed.` });
  };

  if (isLoadingAircraft || isLoadingExpiry) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (error) {
    return <p className="text-destructive text-center p-4">Error loading documents.</p>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Aircraft Documents</CardTitle>
            <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(openDialog) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm">
                        <Upload className="mr-2 h-4 w-4" /> Upload Document
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => openDialog('file')}><FileUp className="mr-2 h-4 w-4" />Upload File</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openDialog('camera')}><Camera className="mr-2 h-4 w-4" />Take Photo</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            />
          </div>
        </CardHeader>
        <CardContent>
          {(aircraft?.documents || []).length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Document Name</TableHead><TableHead>Expiry</TableHead><TableHead className='text-center'>Set Expiry</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {aircraft?.documents?.map((doc) => {
                  const statusColor = getStatusColor(doc.expirationDate);
                  return (
                    <TableRow key={doc.name}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell><div className="flex items-center gap-2">{statusColor && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor }} />} {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</div></TableCell>
                      <TableCell className='text-center'>
                        <Popover><PopoverTrigger asChild><Button variant="outline" size="icon" className='h-8 w-8'><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} /></PopoverContent></Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url)}><View className="mr-2 h-4 w-4" /> View</Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded for this aircraft.</p>
          )}
        </CardContent>
      </Card>
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Document Viewer</DialogTitle><DialogDescription>Viewing uploaded document.</DialogDescription></DialogHeader>{viewingImageUrl && <div className="relative h-[80vh]"><Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }}/></div>}</DialogContent></Dialog>
    </>
  );
}
