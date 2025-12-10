
'use client';

import { useState, use, useMemo, useEffect, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import type { Aircraft, AircraftDocument } from '../page';
import { EditAircraftForm } from './edit-aircraft-form';
import { ViewAircraftDetails } from './view-aircraft-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil, Camera, FileUp, Upload, View, Trash2, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DocumentUploader } from './document-uploader';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format, differenceInDays } from 'date-fns';
import Image from 'next/image';
import type { DocumentExpirySettings } from '../../admin/document-dates/page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

interface AircraftProfilePageProps {
    params: { id: string };
}

const requiredAircraftDocuments = [
    'Certificate of Release to service',
    'Certificate of Registration',
    'Certificate of Airworthiness',
    'Radio',
    'Insurance',
];

export default function AircraftProfilePage({ params }: AircraftProfilePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate'; // Hardcoded for now
    const aircraftId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(false);

    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
    const { toast } = useToast();

    // State for document abbreviations
    const [abbreviations, setAbbreviations] = useState<Record<string, string>>({});

    const debouncedAbbreviations = useDebounce(abbreviations, 500);

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const expirySettingsRef = useMemoFirebase(
      () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
      [firestore, tenantId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);
    const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

    useEffect(() => {
        if (aircraft?.documents) {
          const initialAbbrs = aircraft.documents.reduce((acc, doc) => {
            if (doc.name) {
              acc[doc.name] = doc.abbreviation || '';
            }
            return acc;
          }, {} as Record<string, string>);
          setAbbreviations(initialAbbrs);
        }
      }, [aircraft]);

    // Effect to save debounced abbreviations
    useEffect(() => {
    if (!aircraftDocRef || !aircraft || !aircraft.documents || Object.keys(debouncedAbbreviations).length === 0) return;

    const hasChanged = aircraft.documents.some(
        (doc) => (debouncedAbbreviations[doc.name] || '') !== (doc.abbreviation || '')
    );

    if (hasChanged) {
        const updatedDocuments = aircraft.documents.map(doc => ({
            ...doc,
            abbreviation: debouncedAbbreviations[doc.name] || '',
        }));
        handleDocumentUpdate(updatedDocuments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedAbbreviations, aircraft, aircraftDocRef]);


    const handleAbbreviationChange = (docName: string, value: string) => {
        setAbbreviations(prev => ({ ...prev, [docName]: value }));
    };

    const getStatusColor = (expirationDate: string | null | undefined): string | null => {
      if (!expirationDate || !expirySettings) return null;
  
      const today = new Date();
      const expiry = new Date(expirationDate);
      const daysUntilExpiry = differenceInDays(expiry, today);
  
      if (daysUntilExpiry < 0) {
        return expirySettings.expiredColor || '#ef4444'; // Expired
      }
  
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

    const handleDocumentUpdate = (updatedDocuments: AircraftDocument[]) => {
      if (!aircraftDocRef) {
          toast({
              variant: "destructive",
              title: "Error",
              description: "Could not connect to the database.",
          });
          return;
      }
      updateDocumentNonBlocking(aircraftDocRef, { documents: updatedDocuments });
    };
  
    const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
      if (!aircraft) return;
      const currentDocs = aircraft.documents || [];
      const existingDocIndex = currentDocs.findIndex(d => d.name === docDetails.name);
  
      let updatedDocs;
      if (existingDocIndex > -1) {
          updatedDocs = [...currentDocs];
          const existingDoc = updatedDocs[existingDocIndex];
          updatedDocs[existingDocIndex] = { ...existingDoc, ...docDetails };
      } else {
          updatedDocs = [...currentDocs, docDetails];
      }
      handleDocumentUpdate(updatedDocs);
    };
  
    const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
      if (!aircraft) return;
      const currentDocs = aircraft.documents || [];
      const docIndex = currentDocs.findIndex(d => d.name === docName);
      
      if (docIndex > -1) {
          const updatedDocs = [...currentDocs];
          updatedDocs[docIndex].expirationDate = date ? date.toISOString() : null;
          handleDocumentUpdate(updatedDocs);
      }
    };
  
    const handleDocumentDelete = (docNameToDelete: string) => {
      if (!aircraft) return;
      const currentDocs = aircraft.documents || [];
      const updatedDocs = currentDocs.filter(doc => doc.name !== docNameToDelete);
      handleDocumentUpdate(updatedDocs);
      toast({
          title: "Document Deleted",
          description: `"${docNameToDelete}" has been removed.`,
      });
    };
    
    const combinedDocuments = useMemo(() => {
      if (!aircraft) return [];
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
              abbreviation: uploadedDoc?.abbreviation,
              isRequired: isRequired,
          };
      });
    }, [aircraft]);


    if (isLoading) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-1/4" />
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="text-destructive">Error: {error.message}</div>;
    }

    if (!aircraft) {
        return <div>Aircraft not found.</div>;
    }

    const documentsCardContent = (
      <CardContent>
          {combinedDocuments.length > 0 ? (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Abbr.</TableHead>
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
                              <TableCell>
                                <Input
                                    value={abbreviations[doc.name] || ''}
                                    onChange={(e) => handleAbbreviationChange(doc.name, e.target.value)}
                                    maxLength={5}
                                    className="h-8 w-20"
                                    placeholder="e.g., C172"
                                />
                               </TableCell>
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
            <p className="text-sm text-muted-foreground text-center py-4">No documents configured for this aircraft.</p>
          )}
      </CardContent>
  );

    return (
        <div className='space-y-6'>
            {!isEditing && (
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                    <Button onClick={() => setIsEditing(true)}>
                        <Pencil className='mr-2 h-4 w-4' />
                        Edit Aircraft
                    </Button>
                </div>
            )}
            
            {isEditing ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <EditAircraftForm
                        tenantId={tenantId}
                        aircraft={aircraft}
                        onCancel={() => setIsEditing(false)}
                    />
                    <Card>
                        <CardHeader>
                            <CardTitle>Documents</CardTitle>
                            <CardDescription>Manage documents for {aircraft.tailNumber}.</CardDescription>
                        </CardHeader>
                        {documentsCardContent}
                    </Card>
                </div>
            ) : (
                <ViewAircraftDetails 
                    aircraft={aircraft}
                />
            )}

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
