'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, Upload, Trash2, View, FileUp, Camera } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Aircraft } from '../page';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import { DocumentUploader } from './document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Document = NonNullable<Aircraft['documents']>[0];

interface AircraftDocumentsProps {
    aircraft: Aircraft;
    tenantId: string;
}

export function AircraftDocuments({ aircraft, tenantId }: AircraftDocumentsProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

    const expirySettingsRef = useMemoFirebase(
      () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
      [firestore, tenantId]
    );
    const { data: expirySettings, isLoading: isLoadingExpiry } = useDoc<DocumentExpirySettings>(expirySettingsRef);


    const getStatusColor = (expirationDate: string | null | undefined): string | null => {
        if (isLoadingExpiry || !expirationDate || !expirySettings) return null;

        const today = new Date();
        const expiry = new Date(expirationDate);
        const daysUntilExpiry = differenceInDays(expiry, today);

        if (daysUntilExpiry < 0) {
            return expirySettings.expiredColor || '#ef4444'; // Expired
        }

        const sortedPeriods = expirySettings.warningPeriods.sort((a, b) => a.period - b.period);
        for (const warning of sortedPeriods) {
            if (daysUntilExpiry <= warning.period) {
                return warning.color;
            }
        }
        return expirySettings.defaultColor || null; // Safe color
    };

    const handleDocumentUpdate = (updatedDocuments: Document[]) => {
        if (!firestore) return;
        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
        updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
    };

    const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
        const currentDocs = aircraft.documents || [];
        const existingDocIndex = currentDocs.findIndex(d => d.name === docDetails.name);

        let updatedDocs;
        if (existingDocIndex > -1) {
            updatedDocs = [...currentDocs];
            const expirationDate = updatedDocs[existingDocIndex].expirationDate;
            updatedDocs[existingDocIndex] = { ...docDetails, expirationDate };
        } else {
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
    
    const handleViewImage = (url: string) => {
        setViewingImageUrl(url);
        setIsImageViewerOpen(true);
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

    const requiredDocuments = [
        "Certificate of Airworthiness",
        "Certificate of Registration",
        "Noise Certificate",
        "Aircraft Radio License",
        "Aircraft Flight Manual",
        "Weight and Balance Report",
    ];

    const combinedDocuments = useMemo(() => {
        const uploaded = aircraft.documents || [];
        const allDocNames = new Set([...requiredDocuments, ...uploaded.map(d => d.name)]);

        return Array.from(allDocNames).map(docName => {
            const uploadedDoc = uploaded.find(upDoc => upDoc.name === docName);
            const isRequired = requiredDocuments.includes(docName);
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
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>
                        Manage mandatory and additional documents for {aircraft.tailNumber}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                            {combinedDocuments.map((docItem) => {
                                const statusColor = getStatusColor(docItem.expirationDate);
                                return (
                                <TableRow key={docItem.name}>
                                    <TableCell className="font-medium">{docItem.name}</TableCell>
                                    <TableCell className="min-w-[150px] whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {statusColor && <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />}
                                            {docItem.expirationDate ? format(new Date(docItem.expirationDate), 'PPP') : 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className='text-center'>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="icon" className='h-8 w-8'><CalendarIcon className="h-4 w-4" /></Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <CustomCalendar
                                                    selectedDate={docItem.expirationDate ? new Date(docItem.expirationDate) : undefined}
                                                    onDateSelect={(date) => handleExpirationDateChange(docItem.name, date)}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {docItem.isUploaded ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="outline" size="sm" onClick={() => handleViewImage(docItem.url!)}>
                                                    <View className="mr-2 h-4 w-4" /> View
                                                </Button>
                                                <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(docItem.name)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <DocumentUploader
                                                defaultFileName={docItem.name}
                                                onDocumentUploaded={onDocumentUploaded}
                                                trigger={(openDialog) => (
                                                    <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="sm">
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
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
                    {viewingImageUrl && <div className="relative h-[80vh]"><Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }}/></div>}
                </DialogContent>
            </Dialog>
        </>
    );
}