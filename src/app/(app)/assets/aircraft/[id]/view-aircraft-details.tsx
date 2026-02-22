
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { Button } from '@/components/ui/button';
import { View, Upload, Trash2, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInDays } from 'date-fns';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from '../document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';


const DetailItem = ({ label, value, children }: { label: string; value?: string | null, children?: React.ReactNode }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children ? children : <p className="text-base">{value || 'N/A'}</p>}
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
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { toast } = useToast();

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);
  
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
    [firestore, tenantId]
  );
  const { data: inspectionSettings } = useDoc<any>(inspectionSettingsRef);

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;

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

    return expirySettings.defaultColor || null;
  };
  
  const getHoursBadgeStyle = (remainingHours: number, type: '50' | '100') => {
      if (!inspectionSettings || remainingHours < 0) return { backgroundColor: '#ef4444', color: '#ffffff' };

      const warnings = type === '50' ? inspectionSettings.fiftyHourWarnings : inspectionSettings.oneHundredHourWarnings;
      if (!warnings) return {};

      const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);
      
      for (const warning of sortedWarnings) {
        if (remainingHours <= warning.hours) {
            return { backgroundColor: warning.color, color: warning.foregroundColor };
        }
      }

      return {}; // Default style if no warning threshold is met
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
   const handleDocumentUpdate = (updatedDocuments: NonNullable<Aircraft['documents']>) => {
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
        title: "Document Uploaded",
        description: `"${docDetails.name}" has been added to the aircraft.`,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{aircraft.make} {aircraft.model}</CardTitle>
                    <CardDescription>Tail Number: {aircraft.tailNumber}</CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onEdit}>Edit Details</Button>
                    <Button variant="outline" onClick={onManageComponents}>Manage Components</Button>
                    <Button variant="outline" onClick={onManageDocuments}>Manage Documents</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DetailItem label="Type" value={aircraft.type} />
          <DetailItem label="Frame Hours" value={aircraft.frameHours?.toFixed(1)} />
          <DetailItem label="Engine Hours" value={aircraft.engineHours?.toFixed(1)} />
          <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1)} />
          <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toFixed(1)} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>All documents associated with this aircraft.</CardDescription>
        </CardHeader>
        <CardContent>
            {aircraft.documents && aircraft.documents.length > 0 ? (
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
                        {aircraft.documents.map((doc, index) => {
                             const statusColor = getStatusColor(doc.expirationDate);
                            return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{doc.name}</TableCell>
                                    <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                                    <TableCell className="flex items-center gap-2">
                                        {statusColor && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor }} />}
                                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url)}>
                                            <View className="mr-2 h-4 w-4" /> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded for this aircraft.</p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracked Components</CardTitle>
          <CardDescription>
            A list of all life-limited or tracked components on this aircraft.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {aircraft.components && aircraft.components.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Part No.</TableHead>
                            <TableHead>Serial No.</TableHead>
                            <TableHead>TSN</TableHead>
                            <TableHead>TSO</TableHead>
                            <TableHead>Install Date</TableHead>
                            <TableHead>Hours Remaining</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aircraft.components.map(comp => {
                           const hoursSinceInstall = aircraft.frameHours ? aircraft.frameHours - comp.installHours : 0;
                           const hoursRemaining = comp.maxHours ? comp.maxHours - (comp.tso + hoursSinceInstall) : null;
                            return (
                                <TableRow key={comp.id}>
                                    <TableCell className="font-medium">{comp.name}</TableCell>
                                    <TableCell>{comp.partNumber}</TableCell>
                                    <TableCell>{comp.serialNumber}</TableCell>
                                    <TableCell>{comp.tsn?.toFixed(1)}</TableCell>
                                    <TableCell>{comp.tso?.toFixed(1)}</TableCell>
                                    <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>{hoursRemaining?.toFixed(1) ?? 'N/A'}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No tracked components added.</p>
            )}
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
    </div>
  );
}
