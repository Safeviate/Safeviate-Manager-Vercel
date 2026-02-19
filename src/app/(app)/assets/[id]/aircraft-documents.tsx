'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, CalendarIcon, Trash2, View, FileUp, Camera } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Aircraft } from '@/types/aircraft';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DocumentUploader } from '@/app/(app)/users/personnel/[id]/document-uploader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

interface AircraftDocumentsProps {
  aircraft: Aircraft;
}

type Document = NonNullable<Aircraft['documents']>[0];

export function AircraftDocuments({ aircraft }: AircraftDocumentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const handleDocumentUpdate = (updatedDocuments: Document[]) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/safeviate/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const handleAddNewDocumentType = () => {
    if (!newDocName.trim()) {
      toast({ variant: "destructive", title: "Name Required", description: "Please enter a name for the document type." });
      return;
    }
    const currentDocs = aircraft.documents || [];
    if (currentDocs.some(d => d.name.toLowerCase() === newDocName.trim().toLowerCase())) {
        toast({ variant: "destructive", title: "Duplicate Name", description: "A document with this name already exists." });
        return;
    }
    const newDoc: Document = { name: newDocName.trim(), url: '', uploadDate: '', expirationDate: null };
    handleDocumentUpdate([...currentDocs, newDoc]);
    setNewDocName('');
    setIsAddDocOpen(false);
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = aircraft.documents || [];
    const docIndex = currentDocs.findIndex(d => d.name === docDetails.name);
    if (docIndex > -1) {
      const updatedDocs = [...currentDocs];
      updatedDocs[docIndex] = { ...updatedDocs[docIndex], url: docDetails.url, uploadDate: docDetails.uploadDate };
      handleDocumentUpdate(updatedDocs);
      toast({ title: 'Document Uploaded' });
    }
  };

  const handleExpirationDateChange = (docName: string, date?: Date) => {
    const currentDocs = aircraft.documents || [];
    const docIndex = currentDocs.findIndex(d => d.name === docName);
    if (docIndex > -1) {
      const updatedDocs = [...currentDocs];
      updatedDocs[docIndex].expirationDate = date ? date.toISOString() : null;
      handleDocumentUpdate(updatedDocs);
    }
  };

  const handleDeleteDocument = (docName: string) => {
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    handleDocumentUpdate(updatedDocs);
    toast({ title: 'Document Type Removed' });
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
              <CardTitle>Documents & Maintenance</CardTitle>
              <CardDescription>Manage airworthiness documents and maintenance records.</CardDescription>
            </div>
             <Button onClick={() => setIsAddDocOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Document Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.documents && aircraft.documents.length > 0) ? aircraft.documents.map((doc) => (
                <TableRow key={doc.name}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-right flex gap-2 justify-end">
                    {doc.url ? (
                      <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url!)}><View className="mr-2 h-4 w-4" />View</Button>
                    ) : (
                      <DocumentUploader
                        defaultFileName={doc.name}
                        onDocumentUploaded={onDocumentUploaded}
                        trigger={(openDialog) => (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm"><FileUp className="mr-2 h-4 w-4" />Upload</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => openDialog('file')}>Upload File</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openDialog('camera')}>Take Photo</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      />
                    )}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9"><CalendarIcon className="h-4 w-4" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} />
                        </PopoverContent>
                    </Popover>
                    <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => handleDeleteDocument(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">No documents added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Add New Document Type</DialogTitle>
                  <DialogDescription>Add a new type of document to be tracked for this aircraft.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-2">
                  <Label htmlFor="doc-name">Document Name</Label>
                  <Input id="doc-name" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="e.g., Certificate of Airworthiness" />
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDocOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddNewDocumentType}>Add</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>{viewingImageUrl && <div className="relative h-[80vh]"><Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }}/></div>}</DialogContent>
      </Dialog>
    </>
  );
}