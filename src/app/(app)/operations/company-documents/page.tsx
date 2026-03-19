'use client';

import { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Search, Trash2, CalendarIcon, Eye, PlusCircle, FileType, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CompanyDocument {
  id: string;
  name: string;
  url: string;
  uploadDate: string;
  expirationDate: string | null;
  type: 'file' | 'image';
}

export default function CompanyDocumentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<CompanyDocument | null>(null);

  const canManage = hasPermission('operations-documents-manage');

  const docsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/company-documents`), orderBy('uploadDate', 'desc')) : null),
    [firestore, tenantId]
  );

  const { data: documents, isLoading } = useCollection<CompanyDocument>(docsQuery);

  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const handleDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!firestore || !tenantId) return;
    
    // Determine if it's likely an image (from camera or image file)
    const isImage = docDetails.url.startsWith('data:image/');
    
    const newDoc = {
      name: docDetails.name,
      url: docDetails.url,
      uploadDate: docDetails.uploadDate,
      expirationDate: null,
      type: isImage ? 'image' : 'file'
    };

    addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/company-documents`), newDoc);
    toast({ title: 'Document Added', description: `"${docDetails.name}" has been saved.` });
  };

  const handleUpdateExpiry = (docId: string, date: Date | undefined) => {
    if (!firestore || !tenantId) return;
    const docRef = doc(firestore, `tenants/${tenantId}/company-documents`, docId);
    updateDocumentNonBlocking(docRef, { expirationDate: date ? date.toISOString() : null });
    toast({ title: 'Expiry Updated' });
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !tenantId) return;
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    await deleteDoc(doc(firestore, `tenants/${tenantId}/company-documents`, id));
    toast({ title: 'Document Deleted' });
  };

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Company Documents</h1>
          <p className="text-muted-foreground">Controlled manuals, standard operating procedures, and reference materials.</p>
        </div>
        {canManage && (
          <DocumentUploader
            onDocumentUploaded={handleDocumentUploaded}
            trigger={(open) => (
              <Button onClick={() => open()} className="gap-2 shadow-md">
                <PlusCircle className="h-4 w-4" /> Add Document
              </Button>
            )}
          />
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              className="pl-9 bg-background" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {filteredDocs.length} TOTAL
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredDocs.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-10 text-center">Type</TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => (
                    <TableRow key={doc.id} className="group">
                      <TableCell className="text-center">
                        {doc.type === 'image' ? (
                          <ImageIcon className="h-4 w-4 text-primary mx-auto" />
                        ) : (
                          <FileType className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{doc.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(doc.uploadDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className={cn(
                                  "h-8 text-xs gap-2 font-medium px-3",
                                  !doc.expirationDate && "text-muted-foreground italic border-dashed"
                                )}
                              >
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {doc.expirationDate ? format(new Date(doc.expirationDate), 'dd MMM yyyy') : 'Set Expiry'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CustomCalendar 
                                selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                onDateSelect={(date) => handleUpdateExpiry(doc.id, date)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingDoc(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(doc.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-24 opacity-40">
                <FileText className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-medium">No documents found.</p>
                <p className="text-sm">Controlled manuals and procedures will appear here once added.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b pb-4">
            <DialogTitle>{viewingDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative mt-4 min-h-[60vh] bg-muted/20 rounded-md">
            {viewingDoc?.type === 'image' || viewingDoc?.url.startsWith('data:image/') ? (
              <Image 
                src={viewingDoc.url} 
                alt={viewingDoc.name} 
                fill 
                className="object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <FileText className="h-20 w-20 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Binary file preview is not available in browser. Use the download button below.</p>
                <Button asChild>
                  <a href={viewingDoc?.url} download={viewingDoc?.name}>Download Document</a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
