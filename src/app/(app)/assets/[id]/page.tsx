
'use client';

import { use, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Aircraft } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';
import { AircraftForm } from '../aircraft-form';

// New imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/app/(app)/users/personnel/[id]/document-uploader';
import Image from 'next/image';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, View, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileUp, Camera } from 'lucide-react';

interface AircraftDetailPageProps {
  params: { id: string };
}

type Document = NonNullable<Aircraft['documents']>[0];


// Main Component
export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const { toast } = useToast();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;
  
    const [isEditing, setIsEditing] = useState(false);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
    const [isAddDocOpen, setIsAddDocOpen] = useState(false);
    const [newDocName, setNewDocName] = useState('');
  
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
  
    const handleUpdate = () => {
      // Logic for updating the main aircraft details
      setIsEditing(false);
    };

    // --- Document Management Logic ---
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

    const handleDocumentUpdate = (updatedDocuments: Document[]) => {
        if (!aircraftDocRef) return;
        updateDocumentNonBlocking(aircraftDocRef, { documents: updatedDocuments });
    };

    const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
        const currentDocs = aircraft?.documents || [];
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
        toast({ title: "Document Uploaded", description: `"${docDetails.name}" has been saved.`});
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
        toast({ title: "Document Deleted", description: `"${docNameToDelete}" has been removed.`});
    };
    
    const handleAddDocument = () => {
        if (!newDocName.trim()) {
            toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter a name for the document.' });
            return;
        }
        const currentDocs = aircraft?.documents || [];
        if (currentDocs.some(d => d.name === newDocName.trim())) {
            toast({ variant: 'destructive', title: 'Duplicate Name', description: 'A document with this name already exists.' });
            return;
        }

        const newDoc: Document = {
            name: newDocName.trim(),
            url: '',
            uploadDate: '',
            expirationDate: null,
        };

        handleDocumentUpdate([...currentDocs, newDoc]);
        setNewDocName('');
        setIsAddDocOpen(false);
    };

    const handleViewImage = (url: string) => {
        setViewingImageUrl(url);
        setIsImageViewerOpen(true);
    };


    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      );
    }
  
    if (error) {
      return <div className="text-destructive">Error loading aircraft: {error.message}</div>;
    }
  
    if (!aircraft) {
      return <div>Aircraft not found.</div>;
    }
  
    if (isEditing) {
      return <AircraftForm existingAircraft={aircraft} onCancel={() => setIsEditing(false)} />;
    }
  
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button asChild variant="outline">
                    <Link href="/assets">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Fleet
                    </Link>
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Aircraft
                </Button>
            </div>
    
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{aircraft.tailNumber}</CardTitle>
                    <CardDescription>{aircraft.model}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <DetailItem label="Type" value={aircraft.type} />
                    <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toString()} />
                    <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toString()} />
                    <DetailItem label="Next 50hr" value={aircraft.tachoAtNext50Inspection?.toString()} />
                    <DetailItem label="Next 100hr" value={aircraft.tachoAtNext100Inspection?.toString()} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Documents & Maintenance</CardTitle>
                            <CardDescription>
                                Manage technical logs, certificates, and maintenance records.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setIsAddDocOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Document
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Name</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(aircraft.documents || []).map((doc) => {
                                const statusColor = getStatusColor(doc.expirationDate);
                                return (
                                    <TableRow key={doc.name}>
                                        <TableCell className="font-medium">{doc.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {statusColor && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor }}/>}
                                                {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {doc.url ? (
                                                <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url)}>
                                                    <View className="mr-2 h-4 w-4" /> View
                                                </Button>
                                            ) : (
                                                <DocumentUploader
                                                    defaultFileName={doc.name}
                                                    onDocumentUploaded={onDocumentUploaded}
                                                    trigger={(openDialog) => (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="sm"><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem onSelect={() => openDialog('file')}><FileUp className="mr-2 h-4 w-4" />Upload File</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => openDialog('camera')}><Camera className="mr-2 h-4 w-4" />Take Photo</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                />
                                            )}
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="icon" className='h-9 w-9'><CalendarIcon className="h-4 w-4" /></Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <CustomCalendar
                                                        selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                                        onDateSelect={(date) => handleExpirationDateChange(doc.name, date)}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Button variant="destructive" size="icon" className='h-9 w-9' onClick={() => handleDocumentDelete(doc.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {(aircraft.documents || []).length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">No documents added yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Document Dialog */}
            <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Document Type</DialogTitle>
                        <DialogDescription>
                            Add a new document to the list for this aircraft. You can upload the file after adding it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="new-doc-name">Document Name</Label>
                        <Input 
                            id="new-doc-name"
                            value={newDocName}
                            onChange={(e) => setNewDocName(e.target.value)}
                            placeholder="e.g., Certificate of Airworthiness"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleAddDocument}>Add Document</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Viewer Dialog */}
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
        </div>
    );
}

const DetailItem = ({ label, value }: { label: string; value: string | undefined }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold">{value || 'N/A'}</p>
  </div>
);
