
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format, differenceInDays } from 'date-fns';
import { DocumentUploader } from './document-uploader';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Trash2, Upload, View, FileUp, Camera } from 'lucide-react';
import type { DocumentExpirySettings } from '../../admin/document-dates/page';

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
}

type Document = NonNullable<Aircraft['documents']>[0];

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value?.toString() || 'N/A'}</p>
    </div>
);

const requiredAircraftDocuments = [
    'Certificate of Release to service',
    'Certificate of Registration',
    'Certificate of Airworthiness',
    'Radio',
    'Insurance',
];

export function ViewAircraftDetails({ aircraft }: ViewAircraftDetailsProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded

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

    if (daysUntilExpiry < 0) {
      return expirySettings.expiredColor || '#ef4444'; // Expired
    }

    // Find the tightest warning period that applies
    const sortedPeriods = (expirySettings.warningPeriods || []).sort((a, b) => a.period - b.period);
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
    if (!firestore || !tenantId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the database.",
        });
        return;
    }
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = aircraft.documents || [];
    const existingDocIndex = currentDocs.findIndex(d => d.name === docDetails.name);

    let updatedDocs;
    if (existingDocIndex > -1) {
        // Update existing document
        updatedDocs = [...currentDocs];
        const expirationDate = updatedDocs[existingDocIndex].expirationDate; // Preserve existing expiry
        updatedDocs[existingDocIndex] = { ...docDetails, expirationDate };
    } else {
        // Add new document
        updatedDocs = [...currentDocs, docDetails];
    }
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
  
  const combinedDocuments = useMemo(() => {
    const uploaded = aircraft.documents || [];
    const allDocNames = new Set([...requiredAircraftDocuments, ...uploaded.map(d => d.name)]);

    return Array.from(allDocNames).map(docName => {
        const uploadedDoc = uploaded.find(upDoc => upDoc.name === docName);
        const isRequired = requiredAircraftDocuments.includes(docName);
        return {
            name: docName,
            isUploaded: !!uploadedDoc?.url,
            url: uploadedDoc?.url,
            expirationDate: uploadedDoc?.expirationDate,
            isRequired: isRequired,
        };
    });
  }, [aircraft.documents]);


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Aircraft Information</CardTitle>
                <CardDescription>Details for aircraft {aircraft.tailNumber}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem label="Tail Number" value={aircraft.tailNumber} />
                <DetailItem label="Model" value={aircraft.model} />
                <DetailItem label="Type" value={aircraft.type} />
                <DetailItem label="Frame Hours" value={aircraft.frameHours} />
                <DetailItem label="Engine Hours" value={aircraft.engineHours} />
                <DetailItem label="Hobbs" value={aircraft.hobbs} />
                <DetailItem label="Tacho" value={aircraft.tacho} />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Manage documents for {aircraft.tailNumber}.</CardDescription>
            </CardHeader>
            <CardContent>
               {combinedDocuments.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Document Name</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead className='text-center'>Set Expiry</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {combinedDocuments.map((doc) => {
                            const statusColor = getStatusColor(doc.expirationDate);
                            return (
                                <TableRow key={doc.name}>
                                    <TableCell className="font-medium">{doc.name}</TableCell>
                                    <TableCell className="min-w-[150px] whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {statusColor && (
                                                <span 
                                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: statusColor }}
                                                />
                                            )}
                                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className='text-center'>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="icon" className='h-8 w-8'>
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
                                        {doc.isUploaded ? (
                                            <div className="flex gap-2 justify-end">
                                              <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url!)}>
                                                  <View className="mr-2 h-4 w-4" /> View
                                              </Button>
                                              <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.name)}>
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                        ) : (
                                            <DocumentUploader
                                                defaultFileName={doc.name}
                                                onDocumentUploaded={onDocumentUploaded}
                                                trigger={(openDialog) => (
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button size="sm">
                                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                      <DropdownMenuItem onSelect={() => openDialog('file')}>
                                                        <FileUp className="mr-2 h-4 w-4" />
                                                        Upload File
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onSelect={() => openDialog('camera')}>
                                                        <Camera className="mr-2 h-4 w-4" />
                                                        Take Photo
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                )}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No documents required for this aircraft.</p>
                )}
            </CardContent>
        </Card>
      </div>

       {/* --- Image Viewer Dialog --- */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl">
              <DialogHeader>
                  <DialogTitle>Document Viewer</DialogTitle>
                  <DialogDescription>Viewing uploaded document.</DialogDescription>
              </DialogHeader>
              {viewingImageUrl && (
                  <div className="relative h-[80vh]">
                      <Image 
                          src={viewingImageUrl}
                          alt="Document" 
                          fill
                          style={{ objectFit: 'contain' }}
                      />
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
