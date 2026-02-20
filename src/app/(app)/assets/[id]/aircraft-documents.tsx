'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Aircraft } from '../page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, Trash2, Upload, View, FileUp, Camera, PlusCircle } from 'lucide-react';
import { DocumentUploader } from '@/app/(app)/users/personnel/[id]/document-uploader';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type Document = NonNullable<Aircraft['documents']>[0];

interface AircraftDocumentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftDocuments({ aircraft, tenantId }: AircraftDocumentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  if (!aircraft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
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
    toast({
        title: 'Document Uploaded',
        description: `"${docDetails.name}" has been prepared for saving.`,
    });
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

  const handleAddDocumentType = () => {
    if (!newDocName.trim()) {
        toast({ variant: 'destructive', title: "Name required" });
        return;
    }
    const currentDocs = aircraft.documents || [];
    if (currentDocs.some(d => d.name.toLowerCase() === newDocName.trim().toLowerCase())) {
        toast({ variant: 'destructive', title: "Duplicate name" });
        return;
    }

    const newDoc: Document = {
        name: newDocName.trim(),
        url: '',
        uploadDate: '',
        expirationDate: null,
    };

    handleDocumentUpdate([...currentDocs, newDoc]);
    setIsAddDocOpen(false);
    setNewDocName('');
  };

  return (
    <>
      <Card>
        <CardHeader>
            <div className='flex justify-between items-center'>
              <div>
                  <CardTitle>Aircraft Documents</CardTitle>
                  <CardDescription>Manage airworthiness documents and other files for this aircraft.</CardDescription>
              </div>
              <Button onClick={() => setIsAddDocOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Document
              </Button>
            </div>
        </CardHeader>
        <CardContent>
            {(aircraft.documents || []).length > 0 ? (
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
                        {aircraft.documents?.map((docItem) => {
                            const statusColor = getStatusColor(docItem.expirationDate);
                            return (
                                <TableRow key={docItem.name}>
                                    <TableCell className="font-medium">{docItem.name}</TableCell>
                                    <TableCell className="min-w-[150px] whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {statusColor && (
                                                <span 
                                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: statusColor }}
                                                />
                                            )}
                                            {docItem.expirationDate ? format(new Date(docItem.expirationDate), 'PPP') : 'N/A'}
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
                                                    selectedDate={docItem.expirationDate ? new Date(docItem.expirationDate) : undefined}
                                                    onDateSelect={(date) => handleExpirationDateChange(docItem.name, date)}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {docItem.url ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="outline" size="sm" /* onClick={() => handleViewImage(doc.url!)} */>
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
                                                                <Upload className="mr-2 h-4 w-4" /> Upload
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
                            )
                        })}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No documents for this aircraft yet.</p>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Document Type</DialogTitle>
                <DialogDescription>Add a new document to be tracked for this aircraft.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor='doc-name'>Document Name</Label>
              <Input id="doc-name" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleAddDocumentType}>Add Document</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
