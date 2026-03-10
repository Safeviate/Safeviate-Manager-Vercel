'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ChevronsUpDown, Trash2, Upload, View, PlusCircle, FileText, Eye, Contact, MapPin, PhoneCall, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format, differenceInDays } from 'date-fns';
import { DocumentUploader } from '@/components/document-uploader';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import { TrainingRecords } from './training-records';
import { PilotLogbook } from './pilot-logbook';
import { permissionsConfig } from '@/lib/permissions-config';
import { Separator } from '@/components/ui/separator';

type UserProfile = Personnel | PilotProfile;

interface ViewPersonnelDetailsProps {
  user: UserProfile;
  role: Role | null;
  department: Department | null;
}

type Document = NonNullable<UserProfile['documents']>[0];

const DetailItem = ({ label, value, children }: { label: string; value?: string | null, children?: React.ReactNode }) => (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      {children ? children : <p className="text-sm font-semibold">{value || 'N/A'}</p>}
    </div>
);

const SectionHeader = ({ title, description, icon: Icon, children }: { title: string, description?: string, icon: any, children?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
                <h3 className="text-lg font-bold leading-tight">{title}</h3>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
        </div>
        {children}
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
  const tenantId = 'safeviate';

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
      return expirySettings.expiredColor || '#ef4444'; 
    }

    const sortedPeriods = (expirySettings.warningPeriods || []).sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) {
        return warning.color;
      }
    }

    return expirySettings.defaultColor || null; 
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
  const handleDocumentUpdate = (updatedDocuments: Document[]) => {
    if (!firestore || !tenantId) {
        toast({ variant: "destructive", title: "Error", description: "Database not connected." });
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
        updatedDocs = [...currentDocs];
        const expirationDate = updatedDocs[existingDocIndex].expirationDate; 
        updatedDocs[existingDocIndex] = { ...docDetails, expirationDate };
    } else {
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

  const isStudent = isPilotProfile(user) && user.userType === 'Student';
  const isInstructor = isPilotProfile(user) && user.userType === 'Instructor';
  const isAnyPilot = isPilotProfile(user);

  return (
    <Tabs defaultValue="overview" className="w-full flex flex-col h-full overflow-hidden">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 shrink-0 border-b-0">
            <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Overview</TabsTrigger>
            {isStudent && <TabsTrigger value="training" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Training Records</TabsTrigger>}
            {isAnyPilot && <TabsTrigger value="logbook" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Logbook</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview" className="mt-0 flex-1 min-h-0">
            <Card className="flex flex-col h-full overflow-hidden shadow-none border">
                <CardHeader className="shrink-0 border-b bg-muted/5">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl">User Profile Profile</CardTitle>
                            <CardDescription>Comprehensive details for {user.firstName} {user.lastName}</CardDescription>
                        </div>
                        <Badge variant="outline" className="px-4 py-1 uppercase font-bold tracking-tighter bg-primary/10 text-primary border-primary/20">
                            {user.userType}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-6 space-y-10">
                            
                            {/* 1. Contact & Role Section */}
                            <section>
                                <SectionHeader title="Contact & Role" description="Primary identification and organizational details." icon={Contact} />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-muted/20 p-4 rounded-xl border border-card-border/50">
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
                                                {(user.pilotLicense?.ratings || []).map(r => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}
                                                {(user.pilotLicense?.ratings || []).length === 0 && <p className="text-sm">N/A</p>}
                                            </div>
                                        </DetailItem>
                                        <DetailItem label="Endorsements" >
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {(user.pilotLicense?.endorsements || []).map(e => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                                                {(user.pilotLicense?.endorsements || []).length === 0 && <p className="text-sm">N/A</p>}
                                            </div>
                                        </DetailItem>
                                    </>
                                    )}
                                </div>
                            </section>

                            <Separator className="opacity-50" />

                            {/* 2. Documents Section */}
                            <section>
                                <SectionHeader title="Documents" description="Required and uploaded compliance documentation." icon={FileText}>
                                    <DocumentUploader
                                        onDocumentUploaded={onDocumentUploaded}
                                        trigger={(openDialog) => (
                                            <Button size="sm" variant="outline" onClick={() => openDialog()}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                                            </Button>
                                        )}
                                    />
                                </SectionHeader>
                                <div className="rounded-xl border border-card-border/50 overflow-hidden">
                                    {combinedDocuments.length > 0 ? (
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="text-[10px] uppercase font-bold">Document Name</TableHead>
                                                    <TableHead className="text-[10px] uppercase font-bold">Expiry</TableHead>
                                                    <TableHead className='text-center text-[10px] uppercase font-bold'>Set Expiry</TableHead>
                                                    <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {combinedDocuments.map((doc) => {
                                                    const statusColor = getStatusColor(doc.expirationDate);
                                                    return (
                                                        <TableRow key={doc.name}>
                                                            <TableCell className="font-semibold text-sm">{doc.name}</TableCell>
                                                            <TableCell className="min-w-[150px] whitespace-nowrap">
                                                                <div className="flex items-center gap-2 text-sm">
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
                                                                            <Button size="sm" onClick={() => openDialog()} variant="secondary">
                                                                                <Upload className="mr-2 h-4 w-4" /> Upload
                                                                            </Button>
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
                                            <p className="text-sm text-muted-foreground text-center py-8 bg-muted/10">No documents required for this role.</p>
                                        )}
                                </div>
                            </section>

                            <Separator className="opacity-50" />

                            {/* 3. Address & Emergency Section */}
                            <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div>
                                    <SectionHeader title="Address" description="Primary residence details." icon={MapPin} />
                                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-card-border/50">
                                        <DetailItem label="Street" value={user.address?.street} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailItem label="City" value={user.address?.city} />
                                            <DetailItem label="State" value={user.address?.state} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailItem label="Postal Code" value={user.address?.postalCode} />
                                            <DetailItem label="Country" value={user.address?.country} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <SectionHeader title="Emergency Contact" description="Primary emergency point of contact." icon={PhoneCall} />
                                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-card-border/50">
                                        <DetailItem label="Name" value={user.emergencyContact?.name} />
                                        <DetailItem label="Relationship" value={user.emergencyContact?.relationship} />
                                        <DetailItem label="Phone" value={user.emergencyContact?.phone} />
                                    </div>
                                </div>
                            </section>

                            {!isPilotProfile(user) && (
                                <>
                                    <Separator className="opacity-50" />
                                    {/* 4. Permissions Section */}
                                    <section>
                                        <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
                                            <SectionHeader title="Assigned Permissions" description="Capabilities and access levels granted to this user." icon={ShieldCheck}>
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="gap-2">
                                                        <Badge variant="secondary">{user.permissions?.length || 0} assigned</Badge>
                                                        <ChevronsUpDown className="h-4 w-4" />
                                                    </Button>
                                                </CollapsibleTrigger>
                                            </SectionHeader>
                                            <CollapsibleContent>
                                                <div className="pt-4 border-t border-dashed">
                                                    {user.permissions && user.permissions.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6">
                                                        {permissionsConfig.map((resource) => {
                                                            const assignedActions = resource.actions.filter(action => 
                                                                user.permissions?.includes(`${resource.id}-${action}`)
                                                            );

                                                            if (assignedActions.length === 0) return null;

                                                            return (
                                                                <div key={resource.id} className='space-y-2 break-inside-avoid bg-background/50 p-3 rounded-lg border'>
                                                                    <h4 className='text-xs font-bold uppercase text-primary border-b pb-1 mb-2'>{resource.name}</h4>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {assignedActions.map(action => (
                                                                            <Badge key={action} variant="outline" className="capitalize text-[9px] py-0 px-1.5 font-medium">
                                                                                {action}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground text-center py-4 italic">No custom permissions assigned. Inherits all permissions from the role.</p>
                                                    )}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </section>
                                </>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>
        
        {isStudent && (
            <TabsContent value="training" className="mt-0 flex-1 overflow-hidden">
                <TrainingRecords studentId={user.id} tenantId={tenantId} />
            </TabsContent>
        )}
        
        {isAnyPilot && (
            <TabsContent value="logbook" className="mt-0 flex-1 overflow-hidden">
                <PilotLogbook 
                    userId={user.id} 
                    tenantId={tenantId} 
                    role={isInstructor ? 'instructor' : isStudent ? 'student' : 'private'} 
                />
            </TabsContent>
        )}

        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Document Viewer</DialogTitle>
                </DialogHeader>
                {viewingImageUrl && (
                    <div className="relative h-[80vh] w-full">
                        <Image 
                            src={viewingImageUrl}
                            alt="Document" 
                            fill
                            className="object-contain"
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </Tabs>
  );
}
