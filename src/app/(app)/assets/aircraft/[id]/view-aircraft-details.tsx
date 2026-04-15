'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { Button } from '@/components/ui/button';
import { Eye, Upload, Trash2, Calendar, ShieldCheck, Gauge, Timer, Box, FileText, Zap, Settings, Edit3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HEADER_ACTION_BUTTON_CLASS } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getDocumentExpiryColor } from '@/lib/document-expiry';

const parseLocalDate = (value?: string | null) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const DetailItem = ({ label, value, icon: Icon, children }: { label: string; value?: string | number | null, icon?: any, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-muted/5 border-2 border-transparent hover:border-primary/10 transition-all">
      <div className="flex items-center gap-2 opacity-50">
        {Icon && <Icon className="h-3 w-3" />}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
      </div>
      {children ? children : <p className="text-sm font-black uppercase tracking-tight">{value || 'NOT_SET'}</p>}
    </div>
);


interface ViewAircraftDetailsProps {
    aircraft: Aircraft;
    onEdit: () => void;
    onManageComponents: () => void;
    onManageDocuments: () => void;
}

export function ViewAircraftDetails({ aircraft, onEdit, onManageComponents, onManageDocuments }: ViewAircraftDetailsProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const [expirySettings, setExpirySettings] = useState<DocumentExpirySettings | null>(null);

  useEffect(() => {
    void fetch('/api/tenant-config', { cache: 'no-store' })
      .then((response) => response.json().catch(() => ({})))
      .then((payload) => {
        const settings = payload?.config?.['document-expiry-settings'] as DocumentExpirySettings | undefined;
        if (settings) setExpirySettings(settings);
      })
      .catch((e) => {
        console.error('Failed to load expiry settings', e);
      });
  }, []);
  
  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden bg-background">
                <CardHeader className="p-8 border-b bg-muted/5">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
                                <Zap className="h-8 w-8" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tighter">{aircraft.make} {aircraft.model}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-3 border-2">{aircraft.tailNumber}</Badge>
                                    <Badge className="text-[10px] font-black uppercase tracking-widest px-3 bg-emerald-500 hover:bg-emerald-600 shadow-md">Active Fleet</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={onEdit} className={HEADER_ACTION_BUTTON_CLASS}>
                                <Edit3 className="h-4 w-4" /> Edit Core Data
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailItem label="Asset Category" value={aircraft.type} icon={Box} />
                    <DetailItem label="Airframe Total" value={`${aircraft.frameHours?.toFixed(1) || '0.0'}h`} icon={Settings} />
                    <DetailItem label="Powerplant Total" value={`${aircraft.engineHours?.toFixed(1) || '0.0'}h`} icon={Zap} />
                    <DetailItem label="Mechanical Hobbs" value={`${aircraft.currentHobbs?.toFixed(1) || '0.0'}h`} icon={Timer} />
                    <DetailItem label="Mechanical Tacho" value={`${aircraft.currentTacho?.toFixed(1) || '0.0'}h`} icon={Gauge} />
                </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden bg-background">
                <CardHeader className="p-8 border-b bg-muted/5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Tracked Components</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Critical life-limit and maintenance monitoring.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onManageComponents} className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-4 h-9 rounded-xl">Configure Vault</Button>
                </CardHeader>
                <CardContent className="p-0">
                    {aircraft.components && aircraft.components.length > 0 ? (
                        <Table>
                            <TableHeader className="bg-muted/5">
                                <TableRow className="hover:bg-transparent border-b-2">
                                    <TableHead className="px-8 text-[10px] font-black uppercase tracking-widest h-12">Component Identifier</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 text-center">Part / Serial</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-12 px-8">Accrued (TSO)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aircraft.components.map(comp => (
                                    <TableRow key={comp.id} className="hover:bg-muted/5 transition-colors">
                                        <TableCell className="px-8 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black uppercase tracking-tight">{comp.name}</span>
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground">{comp.installDate ? format(parseLocalDate(comp.installDate) || new Date(comp.installDate), 'dd MMM yyyy') : 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-mono font-black border-2 border-slate-200 px-2 py-0.5 rounded-md bg-white shadow-sm">{comp.serialNumber || 'N/A'}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">{comp.partNumber || 'NA'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-8 text-right font-black text-sm text-foreground">{comp.tso?.toFixed(1) || '0.0'}h</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-24 flex flex-col items-center justify-center opacity-40">
                            <Box className="h-10 w-10 mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No components registered</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="space-y-8">
            <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden bg-background">
                <CardHeader className="p-8 border-b bg-muted/5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Vault</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Airworthiness Archive.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onManageDocuments} className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-4 h-9 rounded-xl">Archive</Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    {aircraft.documents && aircraft.documents.length > 0 ? (
                        aircraft.documents.map((doc, index) => {
                             const statusColor = getDocumentExpiryColor(doc.expirationDate, expirySettings || undefined);
                            return (
                                <div key={index} className="group flex items-center justify-between p-4 rounded-3xl border-2 hover:border-primary/20 transition-all bg-muted/5 cursor-pointer" onClick={() => handleViewImage(doc.url)}>
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-white border shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-tight truncate max-w-[120px]">{doc.name}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {statusColor && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />}
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{doc.expirationDate ? format(parseLocalDate(doc.expirationDate) || new Date(doc.expirationDate), 'dd MMM y') : 'PERM'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-16 opacity-30 flex flex-col items-center">
                            <ShieldCheck className="h-8 w-8 mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Archive Empty</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
      
       <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
            <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden rounded-[2.5rem] border-2 shadow-2xl bg-black/95">
                <DialogHeader className="p-8 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                    <DialogTitle className="text-white text-lg font-black uppercase tracking-tight">Secure Document Viewer</DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-[92vh] flex items-center justify-center">
                    {viewingImageUrl && (
                        <img src={viewingImageUrl} alt="Document Intelligence" className="h-full w-full object-contain" />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
