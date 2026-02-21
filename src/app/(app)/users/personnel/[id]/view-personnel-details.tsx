'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ChevronsUpDown, Trash2, Upload, View, FileUp, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format, differenceInDays } from 'date-fns';
import { DocumentUploader } from './document-uploader';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import { TrainingRecords } from './training-records';

type UserProfile = Personnel | PilotProfile;

interface ViewPersonnelDetailsProps {
  user: UserProfile;
  role: Role | null;
  department: Department | null;
}

type Document = NonNullable<UserProfile['documents']>[0];

const DetailItem = ({ label, value, children }: { label: string; value?: string | null, children?: React.ReactNode }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children ? children : <p className="text-base">{value || 'N/A'}</p>}
    </div>
);

const isPilotProfile = (user: UserProfile): user is PilotProfile => {
    return user.userType === 'Student' || user.userType === 'Private Pilot' || user.userType === 'Instructor';
}

export function ViewPersonnelDetails({ user, role, department }: ViewPersonnelDetailsProps) {
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);


  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;

    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry < 0) {
      return expirySettings.expiredColor || '#ef4444'; // Expired
    }

    // Find the tightest warning period that applies
    const sortedPeriods = expirySettings.warningPeriods.sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) {
        return warning.color;
      }
    }

    return expirySettings.defaultColor || null; // Safe color
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
  const handleDocumentUpdate = (updatedDocuments: Document[]) => {
    if (!firestore || !tenantId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the database.",
        });
        return;
    }
    const collectionName = isPilotProfile(user) ? 
        user.userType === 'Student' ? 'students' : 
        user.userType === 'Instructor' ? 'instructors' : 'private-pilots' 
        : 'personnel';
    const userRef = doc(firestore, 'tenants', tenantId, collectionName, user.id);
    updateDocumentNonBlocking(userRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = user.documents || [];
    const existingDocIndex = currentDocs.findIndex(d => d.name === docDetails.name);

    let updatedDocs;
    if (existingDocIndex > -1) {
        // Update existing document
        updatedDocs = [...currentDocs];
        const expirationDate = updatedDocs[existingDocIndex].expirationDate; // Preserve existing expiry
        updatedDocs[existingDocIndex] = { ...docDetails, expirationDate };
    } else {
        // Add new document
        updatedDocs = [...currentDocs, docDetails];
    }
    handleDocumentUpdate(updatedDocs);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = user.documents || [];
    const docIndex = currentDocs.findIndex(d => d.name === docName);
    
    if (docIndex > -1) {
        const updatedDocs = [...currentDocs];
        updatedDocs[docIndex].expirationDate = date ? date.toISOString() : null;
        handleDocumentUpdate(updatedDocs);
    }
  };

  const handleDocumentDelete = (docNameToDelete: string) => {
    const currentDocs = user.documents || [];
    const updatedDocs = currentDocs.filter(doc => doc.name !== docNameToDelete);
    handleDocumentUpdate(updatedDocs);
    toast({
        title: "Document Deleted",
        description: `"${docNameToDelete}" has been removed.`,
    });
  };

  const combinedDocuments = useMemo(() => {
    const required = role?.requiredDocuments || [];
    const uploaded = user.documents || [];

    const allDocNames = new Set([...required, ...uploaded.map(d => d.name)]);

    return Array.from(allDocNames).map(docName => {
        const uploadedDoc = uploaded.find(upDoc => upDoc.name === docName);
        const isRequired = required.includes(docName);
        return {
            name: docName,
            isUploaded: !!uploadedDoc?.url,
            url: uploadedDoc?.url,
            expirationDate: uploadedDoc?.expirationDate,
            isRequired: isRequired,
        };
    });
  }, [role, user.documents]);


  return (
    <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isPilotProfile(user) && user.userType === 'Student' && (
                <TabsTrigger value="training">Training Records</TabsTrigger>
            )}
        </TabsList>
        <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                            <CardTitle>Contact & Role</CardTitle>
                            <CardDescription>Primary contact and role information.</CardDescription>
                            </div>
                            <Badge>{user.userType}</Badge>
                        </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DetailItem label="First Name" value={user.firstName} />
                            <DetailItem label="Last Name" value={user.lastName} />
                            <DetailItem label="Email" value={user.email} />
                            <DetailItem label="Contact Number" value={user.contactNumber} />
                            {role && <DetailItem label="Role" value={role?.name} />}
                            {!isPilotProfile(user) && department && (
                                <DetailItem label="Department" value={department?.name} />
                            )}
                            {isPilotProfile(user) && (
                            <>
                                <DetailItem label="License Number" value={user.pilotLicense?.licenseNumber} />
                                <DetailItem label="Ratings">
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {(user.pilotLicense?.ratings || []).map(r => <Badge key={r} variant="secondary">{r}</Badge>)}
                                        {(user.pilotLicense?.ratings || []).length === 0 && <p className="text-base">N/A</p>}
                                    </div>
                                </DetailItem>
                                <DetailItem label="Endorsements" >
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {(user.pilotLicense?.endorsements || []).map(e => <Badge key={e} variant="secondary">{e}</Badge>)}
                                        {(user.pilotLicense?.endorsements || []).length === 0 && <p className="text-base">N/A</p>}
                                    </div>
                                </DetailItem>
                            </>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card>
                    <CardHeader>
                        <CardTitle>Documents</CardTitle>
                        <CardDescription>Required and uploaded user documents.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {combinedDocuments.length > 0 ? (
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
                                    {combinedDocuments.map((doc) => {
                                        const statusColor = getStatusColor(doc.expirationDate);
                                        return (
                                            <TableRow key={doc.name}>
                                                <TableCell className="font-medium">{doc.name}</TableCell>
                                                <TableCell className="min-w-[150px] whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {statusColor && (
                                                            <span 
                                                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: statusColor }}
                                                            />
                                                        )}
                                                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
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
                                                                selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                                                onDateSelect={(date) => handleExpirationDateChange(doc.name, date)}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {doc.isUploaded ? (
                                                        <div className="flex gap-2 justify-end">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url!)}>
                                                            <View className="mr-2 h-4 w-4" /> View
                                                        </Button>
                                                        <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.name)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                        </div>
                                                    ) : (
                                                        <DocumentUploader
                                                            defaultFileName={doc.name}
                                                            onDocumentUploaded={onDocumentUploaded}
                                                            trigger={(openDialog) => (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                <Button size="sm">
                                                                    <Upload className="mr-2 h-4 w-4" /> Upload
                                                                </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDialog('file'); }}>
                                                                    <FileUp className="mr-2 h-4 w-4" />
                                                                    Upload File
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDialog('camera'); }}>
                                                                    <Camera className="mr-2 h-4 w-4" />
                                                                    Take Photo
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
                                <p className="text-sm text-muted-foreground text-center py-4">No documents required for this role.</p>
                            )}
                    </CardContent>
                    </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* --- Address --- */}
                    <Card>
                    <CardHeader>
                        <CardTitle>Address</CardTitle>
                        <CardDescription>User's primary address.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DetailItem label="Street" value={user.address?.street} />
                        <DetailItem label="City" value={user.address?.city} />
                        <DetailItem label="State / Province" value={user.address?.state} />
                        <DetailItem label="Postal Code" value={user.address?.postalCode} />
                        <DetailItem label="Country" value={user.address?.country} />
                    </CardContent>
                    </Card>

                    {/* --- Emergency Contact --- */}
                    <Card>
                    <CardHeader>
                        <CardTitle>Emergency Contact</CardTitle>
                        <CardDescription>User's emergency contact information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DetailItem label="Name" value={user.emergencyContact?.name} />
                        <DetailItem label="Relationship" value={user.emergencyContact?.relationship} />
                        <DetailItem label="Phone" value={user.emergencyContact?.phone} />
                    </CardContent>
                    </Card>
                </div>

                {/* --- Permissions --- */}
                {!isPilotProfile(user) && (
                    <Card>
                        <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
                            <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <CardTitle>Assigned Permissions</CardTitle>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="w-9 p-0">
                                            <ChevronsUpDown className="h-4 w-4" />
                                            <span className="sr-only">Toggle</span>
                                        </Button>
                                    </CollapsibleTrigger>
                                </div>
                                <Badge variant="secondary">{user.permissions?.length || 0} assigned</Badge>
                            </CardHeader>
                            <CollapsibleContent>
                                <CardContent>
                                    {user.permissions && user.permissions.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                        {permissionsConfig.map((resource) => {
                                            const assignedActions = resource.actions.filter(action => 
                                                user.permissions.includes(`${resource.id}-${action}`)
                                            );

                                            if (assignedActions.length === 0) return null;

                                            return (
                                                <div key={resource.id} className='space-y-2 break-inside-avoid'>
                                                    <h4 className='font-medium border-b pb-1'>{resource.name}</h4>
                                                    <div className="flex flex-col gap-2 pt-1">
                                                        {assignedActions.map(action => (
                                                            <Badge key={action} variant="outline" className="capitalize w-fit">
                                                                {action}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">No custom permissions assigned. Inherits all permissions from the role.</p>
                                    )}
                                </CardContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </Card>
                )}

                {/* --- Image Viewer Dialog --- */}
                <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Document Viewer</DialogTitle>
                            <DialogDescription>Viewing uploaded document.</DialogDescription>
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
        </TabsContent>
        {isPilotProfile(user) && user.userType === 'Student' && (
            <TabsContent value="training">
                <TrainingRecords studentId={user.id} tenantId={tenantId} />
            </TabsContent>
        )}
    </Tabs>
  );
}
