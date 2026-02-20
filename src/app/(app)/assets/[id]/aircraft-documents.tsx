
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DocumentUploader } from './document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, Trash2, Upload, View, FileUp, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Aircraft } from '../page';

type Document = NonNullable<Aircraft['documents']>[0];

interface AircraftDocumentsProps {
  aircraft: Aircraft;
}

export function AircraftDocuments({ aircraft }: AircraftDocumentsProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded

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
    const updatedDocs = [...currentDocs, docDetails];
    handleDocumentUpdate(updatedDocs);
    toast({
      title: 'Document Uploaded',
      description: `"${docDetails.name}" has been successfully uploaded.`,
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

  const handleDocumentDelete = (docUrlToDelete: string) => {
    const currentDocs = aircraft.documents || [];
    const updatedDocs = currentDocs.filter(doc => doc.url !== docUrlToDelete);
    handleDocumentUpdate(updatedDocs);
    toast({
        title: "Document Deleted",
    });
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Manage airworthiness documents, manuals, and other files.</CardDescription>
          </div>
          <DocumentUploader
            onDocumentUploaded={onDocumentUploaded}
            trigger={(openDialog) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Upload Document
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
        </CardHeader>
        <CardContent>
           <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(aircraft.documents || []).length > 0 ? (
                        aircraft.documents?.map((doc) => (
                            <TableRow key={doc.url}>
                                <TableCell className="font-medium">{doc.name}</TableCell>
                                <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                                <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex gap-2 justify-end">
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
                                        <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url!)}>
                                            <View className="mr-2 h-4 w-4" /> View
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.url)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No documents uploaded.
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
    </>
  );
}
