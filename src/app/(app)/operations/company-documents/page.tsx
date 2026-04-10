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
import { getContrastingTextColor, getDocumentExpiryBadgeStyle } from '@/lib/document-expiry';

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
  const [expirySettings, setExpirySettings] = useState<DocumentExpirySettings | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [docsResponse, configResponse] = await Promise.all([
          fetch('/api/company-documents', { cache: 'no-store' }),
          fetch('/api/tenant-config', { cache: 'no-store' }),
        ]);

        if (!docsResponse.ok) {
          throw new Error('Failed to load documents');
        }

        const [docsPayload, configPayload] = await Promise.all([
          docsResponse.json().catch(() => ({})),
          configResponse.json().catch(() => ({})),
        ]);

        setDocuments(docsPayload.documents || []);

        const config = configPayload?.config && typeof configPayload.config === 'object' ? configPayload.config : {};
        const settings = (config as any)['document-expiry-settings'] as DocumentExpirySettings | undefined;
        setExpirySettings(settings || null);
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
      window.dispatchEvent(new Event('safeviate-document-expiry-settings-updated'));
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
        <CardHeader className="shrink-0 border-b bg-muted/5 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl font-black tracking-tight uppercase">Company Documents</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end min-w-0">
              <div className="relative w-full sm:w-96 lg:w-[360px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  className="pl-9 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Badge variant="outline" className="font-mono text-[10px] h-9 px-3 whitespace-nowrap">
                {filteredDocs.length} TOTAL
              </Badge>
              {canManage && (
                <DocumentUploader
                  onDocumentUploaded={handleDocumentUploaded}
                  trigger={(open) => (
                    <Button
                      onClick={() => open()}
                      variant={isMobile ? "outline" : "default"}
                      size={isMobile ? "sm" : "default"}
                      className={isMobile ? "h-9 w-full justify-between border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:w-auto" : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <PlusCircle className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                        {isMobile ? "Add" : "Add Document"}
                      </span>
                      {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                    </Button>
                  )}
                />
              )}
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
                      <TableCell className="text-center text-sm font-medium text-foreground">
                        {doc.type === 'image' ? (
                          <ImageIcon className="h-4 w-4 text-primary mx-auto" />
                        ) : (
                          <FileType className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{doc.name}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {format(new Date(doc.uploadDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                                <Button 
                                variant="default" 
                                size="sm" 
                                className={cn(
                                  "h-8 text-xs gap-2 font-bold px-3 border shadow-none",
                                  !doc.expirationDate && "text-muted-foreground italic border-dashed"
                                )}
                                style={doc.expirationDate && expiryStyle ? {
                                  backgroundColor: expiryStyle.borderColor || '#ffffff',
                                  borderColor: expiryStyle.borderColor || '#ffffff',
                                  color: getContrastingTextColor(expiryStyle.borderColor || '#ffffff'),
                                } : undefined}
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
                      <TableCell className="text-right text-sm font-medium text-foreground">
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
              <div className="text-center py-24">
                <FileText className="h-16 w-16 mx-auto mb-4 text-foreground/70" />
                <p className="text-lg font-medium text-foreground">No documents found.</p>
                <p className="text-sm text-foreground/80">Controlled manuals and procedures will appear here once added.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">{viewingDoc?.name}</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest">
              Preview the selected company document.
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border bg-muted/20">
            {viewingDoc?.type === 'image' || viewingDoc?.url.startsWith('default_api:image/') ? (
              <Image
                src={viewingDoc.url}
                alt={viewingDoc.name}
                fill
                className="object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <FileText className="h-14 w-14 text-muted-foreground" />
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
