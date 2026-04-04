'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FileText, Search, CalendarIcon, PlusCircle, FileType, ImageIcon, ChevronsUpDown } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { getDocumentExpiryBadgeStyle } from '@/lib/document-expiry';

interface CompanyDocument {
  id: string;
  name: string;
  url: string;
  uploadDate: string;
  expirationDate: string | null;
  type: 'file' | 'image';
}

export default function CompanyDocumentsPage() {
  const { toast } = useToast();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<CompanyDocument | null>(null);

  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const expirySettings: DocumentExpirySettings | undefined = undefined;

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/company-documents', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load documents');
        }
        const payload = await response.json();
        setDocuments(payload.documents || []);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Load Failed',
          description: 'Could not load company documents.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const canManage = hasPermission('operations-documents-manage');

  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    return documents
      .filter(doc => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }, [documents, searchQuery]);

  const handleDocumentUploaded = async (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const isImage = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(docDetails.url) || docDetails.url.includes('/image/');

    const newDoc: CompanyDocument = {
      id: crypto.randomUUID(),
      name: docDetails.name,
      url: docDetails.url,
      uploadDate: docDetails.uploadDate,
      expirationDate: null,
      type: isImage ? 'image' : 'file'
    };

    try {
      const response = await fetch('/api/company-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDoc),
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      setDocuments((prev) => [newDoc, ...prev]);
      toast({ title: 'Document Added', description: `"${docDetails.name}" has been saved.` });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save document metadata.',
      });
    }
  };

  const handleUpdateExpiry = async (docId: string, date: Date | undefined) => {
    const expirationDate = date ? date.toISOString() : null;
    const previous = documents;
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, expirationDate } : d)));
    try {
      const response = await fetch('/api/company-documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: docId, expirationDate }),
      });
      if (!response.ok) {
        throw new Error('Update failed');
      }
      toast({ title: 'Expiry Updated' });
    } catch {
      setDocuments(previous);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update expiry date.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const previous = documents;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      const response = await fetch(`/api/company-documents?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      toast({ title: 'Document Deleted' });
    } catch {
      setDocuments(previous);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete document.',
      });
    }
  };

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {canManage && (
              <div className="flex flex-col gap-1 sm:items-end w-full sm:w-auto">
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Document Control</p>
                <DocumentUploader
                  onDocumentUploaded={handleDocumentUploaded}
                  trigger={(open) => (
                    <Button 
                      onClick={() => open()} 
                      variant={isMobile ? "outline" : "default"}
                      size={isMobile ? "sm" : "default"} 
                      className={isMobile ? "h-9 w-full justify-between border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <PlusCircle className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                        {isMobile ? "Add" : "Add Document"}
                      </span>
                      {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                    </Button>
                  )}
                />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-10 text-center">Type</TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => {
                    const expiryStyle = getDocumentExpiryBadgeStyle(doc.expirationDate, expirySettings);
                    return (
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
                                style={doc.expirationDate && expiryStyle ? expiryStyle : undefined}
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
                          <ViewActionButton onClick={() => setViewingDoc(doc)} />
                          {canManage && (
                            <div className="opacity-0 transition-opacity group-hover:opacity-100">
                              <DeleteActionButton
                                description={`This will permanently delete "${doc.name}".`}
                                onDelete={() => handleDelete(doc.id)}
                                srLabel="Delete document"
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
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
            <DialogDescription>
              Preview the selected company document.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative mt-4 min-h-[60vh] bg-muted/20 rounded-md">
            {viewingDoc?.type === 'image' || viewingDoc?.url.startsWith('default_api:image/') ? (
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
