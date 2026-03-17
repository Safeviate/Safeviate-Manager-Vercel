'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, collection, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import type { ExternalOrganization } from '@/types/quality';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { LogbookTemplate } from '@/app/(app)/development/logbook-parser/page';
import { Switch } from '@/components/ui/switch';

type UserProfile = Personnel | PilotProfile;

interface EditPersonnelFormProps {
  tenantId: string;
  user: UserProfile;
  roles: Role[];
  departments: Department[];
  logbookTemplates: LogbookTemplate[];
  onCancel: () => void;
}

const userTypes: UserProfile['userType'][] = ["Student", "Private Pilot", "Personnel", "Instructor"];

const isPilotProfile = (user: Partial<UserProfile>): user is PilotProfile => {
    return user.userType === 'Student' || user.userType === 'Private Pilot' || user.userType === 'Instructor';
}

const determineCollection = (userType: UserProfile['userType']): string => {
    switch(userType) {
        case 'Personnel': return 'personnel';
        case 'Instructor': return 'instructors';
        case 'Student': return 'students';
        case 'Private Pilot': return 'private-pilots';
        default: return 'personnel'; 
    }
}

export function EditPersonnelForm({ tenantId, user, roles, departments, logbookTemplates, onCancel }: EditPersonnelFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const orgsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/external-organizations`)) : null),
    [firestore, tenantId]
  );
  const { data: organizations } = useCollection<ExternalOrganization>(orgsQuery);

  const [isContactOpen, setIsContactOpen] = useState(true);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  
  useEffect(() => {
    setFormData(JSON.parse(JSON.stringify(user)));
  }, [user]);
  
  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (field: keyof UserProfile, subField: string, value: any) => {
    setFormData(prev => ({
        ...prev,
        [field]: {
            ...(prev[field] as object || {}),
            [subField]: value
        }
    }));
  };

  const handleUpdateUser = () => {
    if (!formData.userType || !formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim()) {
        toast({ variant: 'destructive', title: 'Missing Fields' });
        return;
    }

    if (!firestore || !tenantId) return;
    
    const collectionName = determineCollection(formData.userType);
    const userRef = doc(firestore, 'tenants', tenantId, collectionName, user.id);
    
    let dataToUpdate: Partial<UserProfile> = { ...formData };
    if (!isPilotProfile(formData)) {
        delete (dataToUpdate as Partial<PilotProfile>).pilotLicense;
        delete (dataToUpdate as Partial<PilotProfile>).logbookTemplateId;
    } else {
        delete (dataToUpdate as Partial<Personnel>).department;
    }

    updateDocumentNonBlocking(userRef, dataToUpdate);
    toast({ title: 'User Updated' });
    onCancel();
  };
  
  const allPermissionIds = useMemo(() => 
    permissionsConfig.flatMap(resource => 
      resource.actions.map(action => `${resource.id}-${action}`)
    ),
  []);

  const areAllSelected = useMemo(() => {
    return allPermissionIds.length > 0 && (formData.permissions || []).length === allPermissionIds.length
  }, [formData.permissions, allPermissionIds]);

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    const currentPermissions = formData.permissions || [];
    const newPermissions = checked 
      ? [...currentPermissions, permissionId] 
      : currentPermissions.filter((id) => id !== permissionId);
    handleInputChange('permissions', newPermissions);
  };

  const handleSelectAllToggle = () => {
    handleInputChange('permissions', areAllSelected ? [] : allPermissionIds);
  };
  
  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setFormData(prev => ({
        ...prev,
        role: role.id,
        permissions: role.permissions || [] 
      }));
    }
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>Update details and granular permissions for {user.firstName} {user.lastName}.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <ScrollArea className="h-full">
            <div className="p-6 flex flex-col gap-6">
              <Collapsible open={isContactOpen} onOpenChange={setIsContactOpen}>
                <CollapsibleTrigger asChild>
                  <div className='flex items-center gap-2 mb-4 cursor-pointer'>
                    <h3 className="text-lg font-semibold font-headline">Contact & Role</h3>
                    <Button variant="ghost" size="sm" className="w-9 p-0"><ChevronsUpDown className="h-4 w-4" /></Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>User Type</Label><Select onValueChange={(value) => handleInputChange('userType', value)} value={formData.userType} disabled><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{userTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>First Name</Label><Input value={formData.firstName || ''} onChange={(e) => handleInputChange('firstName', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input value={formData.lastName || ''} onChange={(e) => handleInputChange('lastName', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Contact Number</Label><Input value={formData.contactNumber || ''} onChange={(e) => handleInputChange('contactNumber', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Role</Label><Select onValueChange={handleRoleChange} value={formData.role}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
                  
                  <div className="space-y-2">
                      <Label>Organization</Label>
                      <Select onValueChange={(v) => handleInputChange('organizationId', v === 'internal' ? null : v)} value={formData.organizationId || 'internal'}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="internal">Safeviate (Internal)</SelectItem>
                              {(organizations || []).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/10">
                    <Switch 
                      id="erp-incerfa" 
                      checked={!!formData.isErpIncerfaContact} 
                      onCheckedChange={(val) => handleInputChange('isErpIncerfaContact', val)} 
                    />
                    <Label htmlFor="erp-incerfa" className="cursor-pointer text-xs">ERP INCERFA Contact</Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/10">
                    <Switch 
                      id="erp-alerfa" 
                      checked={!!formData.isErpAlerfaContact} 
                      onCheckedChange={(val) => handleInputChange('isErpAlerfaContact', val)} 
                    />
                    <Label htmlFor="erp-alerfa" className="cursor-pointer text-xs">ERP ALERFA Contact</Label>
                  </div>

                  {!isPilotProfile(formData) && (
                      <div className="space-y-2">
                          <Label>Department</Label>
                          <Select onValueChange={(value) => handleInputChange('department', value)} value={(formData as Personnel).department}>
                              <SelectTrigger><SelectValue/></SelectTrigger>
                              <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                          </Select>
                      </div>
                  )}
                  {isPilotProfile(formData) && (
                    <>
                      <div className="space-y-2"><Label>License Number</Label><Input value={(formData as PilotProfile).pilotLicense?.licenseNumber || ''} onChange={(e) => handleNestedInputChange('pilotLicense', 'licenseNumber', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Logbook Template</Label><Select onValueChange={(value) => handleInputChange('logbookTemplateId', value)} value={(formData as PilotProfile).logbookTemplateId}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{logbookTemplates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
                  <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold font-headline">Permissions</h3>
                          <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-9 p-0"><ChevronsUpDown className="h-4 w-4" /></Button></CollapsibleTrigger>
                      </div>
                      <Button variant="link" onClick={handleSelectAllToggle} className="p-0 h-auto">{areAllSelected ? 'Deselect All' : 'Select All'}</Button>
                  </div>
                  <CollapsibleContent>
                      <ScrollArea className="h-72 w-full rounded-md border mt-2">
                          <div className="p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                  {permissionsConfig.map((resource) => (
                                      <div key={resource.id} className='space-y-2 break-inside-avoid'>
                                          <h4 className='font-medium border-b pb-1'>{resource.name}</h4>
                                          <div className="flex flex-col gap-2 pt-1">
                                              {resource.actions.map((action) => {
                                                  const permissionId = `${resource.id}-${action}`;
                                                  return (
                                                      <div key={permissionId} className="flex items-center space-x-2">
                                                          <Checkbox id={`edit-${permissionId}`} checked={(formData.permissions || []).includes(permissionId)} onCheckedChange={(checked) => handlePermissionToggle(permissionId, !!checked)} />
                                                          <label htmlFor={`edit-${permissionId}`} className="text-sm font-medium leading-none cursor-pointer capitalize">{action}</label>
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </ScrollArea>
                  </CollapsibleContent>
              </Collapsible>
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="shrink-0 border-t pt-6 flex justify-end gap-2 bg-muted/5">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleUpdateUser}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
