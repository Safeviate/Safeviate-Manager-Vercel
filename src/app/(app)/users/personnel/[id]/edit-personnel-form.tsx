
'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

type UserProfile = Personnel | PilotProfile;

interface EditPersonnelFormProps {
  tenantId: string;
  user: UserProfile;
  roles: Role[];
  departments: Department[];
  onCancel: () => void;
}

const userTypes: UserProfile['userType'][] = ["Student", "Private Pilot", "Personnel", "Instructor"];

const isPilotProfile = (user: Partial<UserProfile>): user is PilotProfile => {
    return user.userType === 'Student' || user.userType === 'Private Pilot' || user.userType === 'Instructor';
}

export function EditPersonnelForm({ tenantId, user, roles, departments, onCancel }: EditPersonnelFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State for collapsible sections
  const [isContactOpen, setIsContactOpen] = useState(true);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isPilotLicenseOpen, setIsPilotLicenseOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  
  useEffect(() => {
    // Deep copy to avoid direct mutation
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

  const handleArrayInputChange = (field: keyof PilotProfile, subField: string, value: string) => {
    if (!isPilotProfile(formData)) return;
    const values = value.split(',').map(item => item.trim()).filter(Boolean);
    handleNestedInputChange(field, subField, values);
  };


  const handleUpdateUser = () => {
    if (!formData.userType || !formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim()) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'User Type, First Name, Last Name, and Email are required.',
        });
        return;
    }

    if (!formData.role) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Role is required for all users.',
        });
        return;
    }

    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
        });
        return;
    }
    
    const collectionName = isPilotProfile(formData) ? 'pilots' : 'personnel';
    const userRef = doc(firestore, 'tenants', tenantId, collectionName, user.id);
    
    let dataToUpdate: Partial<UserProfile> = { ...formData };
    if (!isPilotProfile(formData)) {
        // Ensure pilot-specific fields are not on personnel
        delete (dataToUpdate as Partial<PilotProfile>).pilotLicense;
    } else {
        // Ensure personnel-specific fields are not on pilots, except role
        delete (dataToUpdate as Partial<Personnel>).department;
        delete (dataToUpdate as Partial<Personnel>).permissions;
    }

    updateDocumentNonBlocking(userRef, dataToUpdate);


    toast({
        title: 'User Updated',
        description: `User ${formData.firstName} ${formData.lastName} is being updated.`,
    });
    
    onCancel(); // Go back to view mode after saving
  };
  
  // --- Permissions Logic ---
  const allPermissionIds = useMemo(() => 
    permissionsConfig.flatMap(resource => 
      resource.actions.map(action => `${resource.id}-${action}`)
    ),
  []);

  const personnelData = formData as Personnel;

  const areAllSelected = useMemo(() => {
    if (isPilotProfile(formData)) return false;
    return allPermissionIds.length > 0 && personnelData.permissions?.length === allPermissionIds.length
  }, [formData, allPermissionIds, personnelData.permissions]);

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (isPilotProfile(formData)) return;
    const currentPermissions = personnelData.permissions || [];
    const newPermissions = checked 
      ? [...currentPermissions, permissionId] 
      : currentPermissions.filter((id) => id !== permissionId);
    handleInputChange('permissions', newPermissions);
  };

  const handleSelectAllToggle = () => {
    if (isPilotProfile(formData)) return;
    if (areAllSelected) {
      handleInputChange('permissions', []);
    } else {
      handleInputChange('permissions', allPermissionIds);
    }
  };
  
  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      if (isPilotProfile(formData)) {
        setFormData(prev => ({
          ...prev,
          role: role.id,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          role: role.id,
          permissions: role.permissions || []
        }));
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
            Update details for {user.firstName} {user.lastName}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-25rem)] pr-6">
            <div className="flex flex-col gap-6 py-4">

              {/* --- Contact & Role --- */}
              <Collapsible open={isContactOpen} onOpenChange={setIsContactOpen}>
                <CollapsibleTrigger asChild>
                  <div className='flex items-center gap-2 mb-4 cursor-pointer'>
                    <h3 className="text-lg font-semibold">Contact & Role</h3>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="userType">User Type</Label>
                      <Select onValueChange={(value) => handleInputChange('userType', value)} value={formData.userType} disabled>
                          <SelectTrigger id="userType">
                              <SelectValue placeholder="Select a user type" />
                          </SelectTrigger>
                          <SelectContent>
                              {userTypes.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" value={formData.firstName || ''} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" value={formData.lastName || ''} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input id="contactNumber" value={formData.contactNumber || ''} onChange={(e) => handleInputChange('contactNumber', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select onValueChange={handleRoleChange} value={formData.role}>
                          <SelectTrigger id="role">
                              <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                              {roles.map(role => (
                                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  {!isPilotProfile(formData) && (
                      <div className="space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <Select onValueChange={(value) => handleInputChange('department', value)} value={personnelData.department}>
                              <SelectTrigger id="department">
                                  <SelectValue placeholder="Select a department" />
                              </SelectTrigger>
                              <SelectContent>
                                  {departments.map(dept => (
                                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                  )}
                  {isPilotProfile(formData) && (
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input id="licenseNumber" value={formData.pilotLicense?.licenseNumber || ''} onChange={(e) => handleNestedInputChange('pilotLicense', 'licenseNumber', e.target.value)} />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* --- Pilot License --- */}
              {isPilotProfile(formData) && (
                <>
                    <Collapsible open={isPilotLicenseOpen} onOpenChange={setIsPilotLicenseOpen}>
                        <CollapsibleTrigger asChild>
                        <div className='flex items-center gap-2 mb-4 cursor-pointer'>
                            <h3 className="text-lg font-semibold">Pilot License Details</h3>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            </Button>
                        </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ratings">Ratings</Label>
                                    <Input id="ratings" value={(formData.pilotLicense?.ratings || []).join(', ')} onChange={(e) => handleArrayInputChange('pilotLicense', 'ratings', e.target.value)} placeholder="e.g., IFR, ME" />
                                    <p className="text-xs text-muted-foreground">Enter values separated by commas.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endorsements">Endorsements</Label>
                                    <Input id="endorsements" value={(formData.pilotLicense?.endorsements || []).join(', ')} onChange={(e) => handleArrayInputChange('pilotLicense', 'endorsements', e.target.value)} placeholder="e.g., High Performance, Complex" />
                                    <p className="text-xs text-muted-foreground">Enter values separated by commas.</p>
                                </div>
                           </div>
                           <div className="space-y-4">
                                 <div className="space-y-2">
                                    <Label>Expiration Date</Label>
                                    {formData.pilotLicense?.expirationDate && <p className="text-sm text-muted-foreground">Selected: {format(new Date(formData.pilotLicense.expirationDate), "PPP")}</p>}
                                    <CustomCalendar 
                                        selectedDate={formData.pilotLicense?.expirationDate ? new Date(formData.pilotLicense.expirationDate) : undefined}
                                        onDateSelect={(date) => handleNestedInputChange('pilotLicense', 'expirationDate', date?.toISOString().split('T')[0])}
                                    />
                                </div>
                           </div>
                        </CollapsibleContent>
                    </Collapsible>
                    <Separator />
                </>
              )}

              {/* --- Address --- */}
              <Collapsible open={isAddressOpen} onOpenChange={setIsAddressOpen}>
                <CollapsibleTrigger asChild>
                  <div className='flex items-center gap-2 mb-4 cursor-pointer'>
                    <h3 className="text-lg font-semibold">Address</h3>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-3">
                        <Label htmlFor="street">Street</Label>
                        <Input id="street" value={formData.address?.street || ''} onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={formData.address?.city || ''} onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state">State / Province</Label>
                        <Input id="state" value={formData.address?.state || ''} onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input id="postalCode" value={formData.address?.postalCode || ''} onChange={(e) => handleNestedInputChange('address', 'postalCode', e.target.value)} />
                    </div>
                    <div className="space-y-2 col-span-3">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" value={formData.address?.country || ''} onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)} />
                    </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* --- Emergency Contact --- */}
              <Collapsible open={isEmergencyOpen} onOpenChange={setIsEmergencyOpen}>
                <CollapsibleTrigger asChild>
                  <div className='flex items-center gap-2 mb-4 cursor-pointer'>
                    <h3 className="text-lg font-semibold">Emergency Contact</h3>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="emergencyName">Full Name</Label>
                        <Input id="emergencyName" value={formData.emergencyContact?.name || ''} onChange={(e) => handleNestedInputChange('emergencyContact', 'name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emergencyRelationship">Relationship</Label>
                        <Input id="emergencyRelationship" value={formData.emergencyContact?.relationship || ''} onChange={(e) => handleNestedInputChange('emergencyContact', 'relationship', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emergencyPhone">Phone Number</Label>
                        <Input id="emergencyPhone" value={formData.emergencyContact?.phone || ''} onChange={(e) => handleNestedInputChange('emergencyContact', 'phone', e.target.value)} />
                    </div>
                </CollapsibleContent>
              </Collapsible>
              
              {!isPilotProfile(formData) && (
                <>
                <Separator />
                {/* --- Permissions --- */}
                    <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold">Permissions</h3>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-9 p-0">
                                        <ChevronsUpDown className="h-4 w-4" />
                                        <span className="sr-only">Toggle</span>
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                            <Button variant="link" onClick={handleSelectAllToggle} className="p-0 h-auto">
                                {areAllSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>
                        <p className='text-sm text-muted-foreground'>Customize permissions that override the assigned role.</p>
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
                                                            <div
                                                                key={permissionId}
                                                                className="flex items-center space-x-2"
                                                            >
                                                                <Checkbox
                                                                    id={`edit-${permissionId}`}
                                                                    checked={(personnelData.permissions || []).includes(permissionId)}
                                                                    onCheckedChange={(checked) => handlePermissionToggle(permissionId, !!checked)}
                                                                />
                                                                <label
                                                                    htmlFor={`edit-${permissionId}`}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                                                                >
                                                                    {action}
                                                                </label>
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
                </>
              )}
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleUpdateUser}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
