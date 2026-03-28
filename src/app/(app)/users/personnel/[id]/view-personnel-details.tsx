'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Trash2, Upload, Eye, PlusCircle, Contact, PhoneCall, ShieldCheck, ShieldAlert, LayoutGrid, ListFilter, UserCircle, ClipboardCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';
import { DocumentUploader } from '@/components/document-uploader';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import { TrainingRecords } from './training-records';
import { PilotLogbook } from './pilot-logbook';
import { permissionsConfig } from '@/lib/permissions-config';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { menuConfig } from '@/lib/menu-config';
import { Label } from '@/components/ui/label';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getDocumentExpiryColor } from '@/lib/document-expiry';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';
import { MainPageHeader } from '@/components/page-header';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';

type UserProfile = Personnel | PilotProfile;

interface ViewPersonnelDetailsProps {
  user: UserProfile;
  role: Role | null;
  department: Department | null;
  actions?: React.ReactNode;
}

type Document = NonNullable<UserProfile['documents']>[0];

const DetailItem = ({ label, value, children }: { label: string; value?: string | null, children?: React.ReactNode }) => (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      {children ? children : <p className="text-sm font-bold text-foreground">{value || 'N/A'}</p>}
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
    </div>
);

const isPilotProfile = (user: UserProfile): user is PilotProfile => {
    return user.userType === 'Student' || user.userType === 'Private Pilot' || user.userType === 'Instructor';
}

export function ViewPersonnelDetails({ user, role, department, actions }: ViewPersonnelDetailsProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [hiddenMenus, setHiddenMenus] = useState<string[]>(user.accessOverrides?.hiddenMenus || []);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();

  const canEdit = hasPermission('users-edit');

  useEffect(() => {
    setHiddenMenus(user.accessOverrides?.hiddenMenus || []);
  }, [user]);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };
  
  const handleDocumentUpdate = (updatedDocuments: Document[]) => {
    if (!firestore || !tenantId) return;
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
    toast({ title: "Document Deleted" });
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

  const handleToggleMenuOverride = async (href: string, hidden: boolean, subHrefs?: string[]) => {
    if (!firestore || !tenantId || !canEdit) return;
    
    const currentHidden = hiddenMenus;
    let newHidden: string[];

    if (hidden) {
      const toHide = [href, ...(subHrefs || [])];
      newHidden = Array.from(new Set([...currentHidden, ...toHide]));
    } else {
      const toShow = [href, ...(subHrefs || [])];
      newHidden = currentHidden.filter(h => !toShow.includes(h));
    }
    
    const collectionName = isPilotProfile(user) ? (user.userType === 'Student' ? 'students' : user.userType === 'Instructor' ? 'instructors' : 'private-pilots') : 'personnel';
    const userRef = doc(firestore, 'tenants', tenantId, collectionName, user.id);
    try {
      await updateDoc(userRef, { 'accessOverrides.hiddenMenus': newHidden });
      setHiddenMenus(newHidden);
      window.dispatchEvent(new Event('safeviate-profile-updated'));
      toast({ title: hidden ? "Access Restricted" : "Access Restored" });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Module access could not be updated. Please try again.',
      });
    }
  };

  const handlePermissionToggle = async (permissionId: string, checked: boolean) => {
    if (!firestore || !tenantId || !canEdit) return;
    const currentPermissions = user.permissions || [];
    const isInherited = role?.permissions?.includes(permissionId);

    if (!isInherited) {
        toast({
            variant: 'destructive',
            title: 'Role Required',
            description: 'This permission must be granted by the role before an individual override can be applied.',
        });
        return;
    }

    let newPermissions: string[];

    newPermissions = checked
        ? currentPermissions.filter(p => p !== `!${permissionId}`)
        : [...currentPermissions.filter(p => p !== permissionId), `!${permissionId}`];

    const collectionName = isPilotProfile(user) ? (user.userType === 'Student' ? 'students' : user.userType === 'Instructor' ? 'instructors' : 'private-pilots') : 'personnel';
    const userRef = doc(firestore, 'tenants', tenantId, collectionName, user.id);
    try {
      await updateDoc(userRef, { permissions: newPermissions });
      toast({ title: "Access Level Updated" });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Granular permissions could not be updated. Please try again.',
      });
    }
  };

  const isStudent = isPilotProfile(user) && user.userType === 'Student';
  const isAnyPilot = isPilotProfile(user);

  const availableTabs = useMemo(() => {
    const tabs = [
        { value: 'overview', label: 'Overview', icon: UserCircle },
        { value: 'documents', label: 'Documents', icon: LayoutGrid },
        { value: 'access', label: 'Module Access', icon: ShieldCheck },
        { value: 'permissions', label: 'Granular Permissions', icon: ShieldAlert },
    ];
    if (isStudent) tabs.push({ value: 'training', label: 'Training Records', icon: ClipboardCheck });
    if (isAnyPilot) tabs.push({ value: 'logbook', label: 'Logbook', icon: ClipboardCheck });
    return tabs;
  }, [isStudent, isAnyPilot]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
        <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
            <MainPageHeader 
                title={`${user.firstName} ${user.lastName}`}
                actions={actions}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
                <ResponsiveTabRow
                    value={activeTab}
                    onValueChange={setActiveTab}
                    placeholder="Select Section"
                    className="border-b bg-muted/5 px-4 py-3 shrink-0"
                    options={availableTabs}
                />

                <CardContent className="flex-1 p-0 overflow-hidden bg-background">
                    <ScrollArea className="h-full">
                        <div className="p-0">
                            <TabsContent value="overview" className="m-0">
                                <div className="p-6 space-y-10">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-2">
                                            {user.isErpIncerfaContact && (
                                                <Badge className="bg-red-600 text-white gap-1.5 h-7 px-3 text-[10px] font-black uppercase">
                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                    Designated INCERFA Contact
                                                </Badge>
                                            )}
                                            {user.isErpAlerfaContact && (
                                                <Badge className="bg-amber-600 text-white gap-1.5 h-7 px-3 text-[10px] font-black uppercase">
                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                    Designated ALERFA Contact
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <section>
                                        <SectionHeader title="Contact & Role" icon={Contact} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <DetailItem label="User Number" value={user.userNumber} />
                                            <DetailItem label="First Name" value={user.firstName} />
                                            <DetailItem label="Last Name" value={user.lastName} />
                                            <DetailItem label="Email" value={user.email} />
                                            <DetailItem label="Contact Number" value={user.contactNumber} />
                                            <DetailItem label="Role" value={role?.name} />
                                            {!isPilotProfile(user) && <DetailItem label="Department" value={department?.name} />}
                                            {isPilotProfile(user) && (
                                                <>
                                                    <DetailItem label="License Number" value={user.pilotLicense?.licenseNumber} />
                                                    <DetailItem label="Ratings">
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {(user.pilotLicense?.ratings || []).map(r => <Badge key={r} variant="secondary" className="text-[9px] font-black uppercase">{r}</Badge>)}
                                                            {(user.pilotLicense?.ratings || []).length === 0 && <p className="text-sm font-bold text-muted-foreground italic">N/A</p>}
                                                        </div>
                                                    </DetailItem>
                                                    <DetailItem label="Endorsements" >
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {(user.pilotLicense?.endorsements || []).map(e => <Badge key={e} variant="secondary" className="text-[9px] font-black uppercase">{e}</Badge>)}
                                                            {(user.pilotLicense?.endorsements || []).length === 0 && <p className="text-sm font-bold text-muted-foreground italic">N/A</p>}
                                                        </div>
                                                    </DetailItem>
                                                </>
                                            )}
                                        </div>
                                    </section>
                                    <Separator />
                                    <section>
                                        <SectionHeader title="Emergency Contact" icon={PhoneCall} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <DetailItem label="Full Name" value={user.emergencyContact?.name} />
                                            <DetailItem label="Relationship" value={user.emergencyContact?.relationship} />
                                            <DetailItem label="Phone Number" value={user.emergencyContact?.phone} />
                                        </div>
                                    </section>
                                </div>
                            </TabsContent>

                            <TabsContent value="documents" className="m-0">
                                <div className="p-6 space-y-6">
                                    <div className="flex justify-between items-center bg-muted/5 p-4 border rounded-xl">
                                        <div className="space-y-0.5">
                                            <h4 className="text-sm font-black uppercase tracking-tight">Support Documents</h4>
                                            <p className="text-xs text-muted-foreground">Required and uploaded compliance documentation.</p>
                                        </div>
                                        <DocumentUploader
                                            onDocumentUploaded={onDocumentUploaded}
                                            trigger={(openDialog) => (
                                                <Button size="compact" variant="outline" onClick={() => openDialog()}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                                                </Button>
                                            )}
                                        />
                                    </div>
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        {combinedDocuments.length > 0 ? (
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Document Name</TableHead>
                                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Expiry</TableHead>
                                                        <TableHead className='text-center text-[10px] uppercase font-bold tracking-wider'>Set Expiry</TableHead>
                                                        <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {combinedDocuments.map((doc) => {
                                                        const statusColor = getDocumentExpiryColor(doc.expirationDate, expirySettings);
                                                        return (
                                                            <TableRow key={doc.name}>
                                                                <TableCell className="font-bold text-sm">{doc.name}</TableCell>
                                                                <TableCell className="min-w-[150px] whitespace-nowrap">
                                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                                        {statusColor && (
                                                                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                                                                        )}
                                                                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className='text-center'>
                                                                    <Popover>
                                                                        <PopoverTrigger asChild><Button variant="outline" size="icon" className='h-8 w-8'><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => date && handleExpirationDateChange(doc.name, date)} /></PopoverContent>
                                                                    </Popover>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {doc.isUploaded ? (
                                                                        <div className="flex gap-2 justify-end">
                                                                            <ViewActionButton onClick={() => handleViewImage(doc.url!)} />
                                                                            <DeleteActionButton
                                                                                description={`This will permanently delete "${doc.name}".`}
                                                                                onDelete={() => handleDocumentDelete(doc.name)}
                                                                                srLabel="Delete document"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <DocumentUploader defaultFileName={doc.name} onDocumentUploaded={onDocumentUploaded} trigger={(openDialog) => (<Button size="compact" onClick={() => openDialog()} variant="secondary"><Upload className="mr-2 h-4 w-4" /> Upload</Button>)} />
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                            ) : <p className="text-sm text-muted-foreground text-center py-8 bg-muted/10 italic">No documents required.</p>}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="access" className="m-0">
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {menuConfig.map((menu) => {
                                            const subHrefs = menu.subItems?.map(s => s.href) || [];
                                            
                                            return (
                                                  <div key={menu.href} className="p-4 border rounded-xl bg-muted/10 space-y-3">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id={`user-mod-${menu.href}`} 
                                                            checked={!hiddenMenus.includes(menu.href)}
                                                            onCheckedChange={(val) => handleToggleMenuOverride(menu.href, !val, subHrefs)}
                                                            disabled={!canEdit}
                                                        />
                                                        <Label htmlFor={`user-mod-${menu.href}`} className="font-black uppercase text-[11px] flex items-center gap-2 cursor-pointer">
                                                            <menu.icon className="h-4 w-4 text-primary" />
                                                            {menu.label}
                                                        </Label>
                                                    </div>
                                                    {menu.subItems && (
                                                        <div className="pl-6 space-y-2 border-l ml-2">
                                                            {menu.subItems.map((sub) => {
                                                                return (
                                                                    <div key={sub.href} className="flex items-center space-x-2">
                                                                        <Checkbox 
                                                                            id={`user-submod-${sub.href}`} 
                                                                            checked={!hiddenMenus.includes(sub.href)}
                                                                            onCheckedChange={(val) => handleToggleMenuOverride(sub.href, !val)}
                                                                            disabled={!canEdit}
                                                                        />
                                                                        <Label htmlFor={`user-submod-${sub.href}`} className="text-[10px] font-bold uppercase text-muted-foreground cursor-pointer">
                                                                            {sub.label}
                                                                        </Label>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="permissions" className="m-0">
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {permissionsConfig.map((resource) => (
                                            <div key={resource.id} className='space-y-3 bg-background p-4 rounded-xl border border-slate-200 shadow-sm'>
                                                <h4 className='text-[10px] font-black uppercase text-primary border-b border-primary/20 pb-2 mb-3 tracking-widest'>{resource.name}</h4>
                                                <div className="flex flex-col gap-2.5">
                                                    {resource.actions.map(action => {
                                                        const permissionId = `${resource.id}-${action}`;
                                                        const isInherited = role?.permissions?.includes(permissionId);
                                                        const isOverridden = user.permissions?.includes(permissionId);
                                                        const isDenied = user.permissions?.includes(`!${permissionId}`);
                                                        const isEffective = (isInherited && !isDenied) || isOverridden;
                                                        return (
                                                            <div key={action} className="flex items-center space-x-3">
                                                                <Checkbox
                                                                  id={`perm-${permissionId}`}
                                                                  checked={!!isEffective}
                                                                  disabled={!canEdit || !isInherited}
                                                                  onCheckedChange={(checked) => handlePermissionToggle(permissionId, !!checked)}
                                                                />
                                                                <label htmlFor={`perm-${permissionId}`} className={cn("text-[11px] font-bold uppercase cursor-pointer", isInherited && !isDenied && !isOverridden && "text-muted-foreground italic")}>
                                                                    {action}
                                                                    {isInherited && !isDenied && !isOverridden && <span className="ml-2 text-[9px] opacity-70">(Role)</span>}
                                                                    {isOverridden && <span className="ml-2 text-[9px] text-primary opacity-70">(Override)</span>}
                                                                    {isDenied && <span className="ml-2 text-[9px] text-destructive opacity-70">(Denied)</span>}
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                            
                            {isStudent && <TabsContent value="training" className="m-0"><TrainingRecords studentId={user.id} tenantId={tenantId!} /></TabsContent>}
                            {isAnyPilot && <TabsContent value="logbook" className="m-0"><PilotLogbook userId={user.id} tenantId={tenantId!} role={user.userType === 'Instructor' ? 'instructor' : user.userType === 'Student' ? 'student' : 'private'} /></TabsContent>}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Tabs>
        </Card>

        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Document Viewer</DialogTitle></DialogHeader>
                {viewingImageUrl && <div className="relative h-[80vh] w-full mt-4"><Image src={viewingImageUrl} alt="Document" fill className="object-contain" /></div>}
            </DialogContent>
        </Dialog>
    </div>
  );
}
