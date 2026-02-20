
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, View, Upload, Trash2, FileUp, Camera } from 'lucide-react';
import Image from 'next/image';
import { format, differenceInDays } from 'date-fns';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from '@/app/(app)/users/personnel/[id]/document-uploader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Aircraft } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';

type Document = NonNullable<Aircraft['documents']>[0];

interface AircraftDocumentsProps {
  aircraft: Aircraft;
}

export function AircraftDocuments({ aircraft }: AircraftDocumentsProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  if (!aircraft) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-40 w-full" />
            </CardContent>
        </Card>
    );
  }

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;

    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry < 0) {
      return expirySettings.expiredColor || '#ef4444';
    }

    const sortedPeriods = [...expirySettings.warningPeriods].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) {
        return warning.color;
      }
    }

    return expirySettings.defaultColor || null;
  };

  const handleDocumentUpdate = (updatedDocuments: Document[]) => {
    if (!firestore || !tenantId) {
        toast({ variant: "destructive", title: "Error", description: "Could not connect to the database." });
        return;
    }
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    handleDocumentUpdate(updatedDocs);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft.documents || [];
    const docIndex = currentDocs.findIndex(d => d.name === docName);
    
    if (docIndex > -1) {
        const updatedDocs = [...currentDocs];
        updatedDocs[docIndex].expirationDate = date ? date.toISOString() : null;
        handleDocumentUpdate(updatedDocs);
    }
  };

  const handleDocumentDelete = (docNameToDelete: string) => {
    const currentDocs = aircraft.documents || [];
    const updatedDocs = currentDocs.filter(doc => doc.name !== docNameToDelete);
    handleDocumentUpdate(updatedDocs);
    toast({
        title: "Document Deleted",
        description: `"${docNameToDelete}" has been removed.`,
    });
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Aircraft Documents</CardTitle>
              <CardDescription>Manage airworthiness certificates, insurance, and other related documents.</CardDescription>
            </div>
            <DocumentUploader
              onDocumentUploaded={onDocumentUploaded}
              trigger={(openDialog) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Upload className="mr-2 h-4 w-4" /> Upload Document
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => openDialog('file')}>
                      <FileUp className="mr-2 h-4 w-4" /> Upload File
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openDialog('camera')}>
                      <Camera className="mr-2 h-4 w-4" /> Take Photo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.documents || []).length > 0 ? (
                aircraft.documents?.map((docItem) => {
                  const statusColor = getStatusColor(docItem.expirationDate);
                  return (
                    <TableRow key={docItem.name}>
                      <TableCell className="font-medium">{docItem.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusColor && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor }} />}
                          {docItem.expirationDate ? format(new Date(docItem.expirationDate), 'PPP') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className='h-8 w-8'><CalendarIcon className="h-4 w-4" /></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CustomCalendar selectedDate={docItem.expirationDate ? new Date(docItem.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(docItem.name, date)} />
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" size="sm" onClick={() => handleViewImage(docItem.url)}>
                                <View className="mr-2 h-4 w-4" /> View
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(docItem.name)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                    No documents uploaded for this aircraft.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document Viewer</DialogTitle>
          </DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[80vh]">
              <Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
