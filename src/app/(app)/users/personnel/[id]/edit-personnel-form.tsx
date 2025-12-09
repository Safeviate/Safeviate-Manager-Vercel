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
import type { Personnel } from '../page';
import type { Role } from '../../../roles/page';
import type { Department } from '../../../admin/department/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface EditPersonnelFormProps {
  tenantId: string;
  personnel: Personnel;
  roles: Role[];
  departments: Department[];
  onCancel: () => void;
}

type License = NonNullable<Personnel['licenses']>[0];

export function EditPersonnelForm({ tenantId, personnel, roles, departments, onCancel }: EditPersonnelFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State for collapsible sections
  const [isContactOpen, setIsContactOpen] = useState(true);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isIdentificationOpen, setIsIdentificationOpen] = useState(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Personnel>>({});
  
  useEffect(() => {
    // Deep copy to avoid direct mutation
    setFormData(JSON.parse(JSON.stringify(personnel)));
  }, [personnel]);
  
  const handleInputChange = (field: keyof Personnel, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (field: keyof Personnel, subField: string, value: any) => {
    setFormData(prev => ({
        ...prev,
        [field]: {
            ...(prev[field] as object || {}),
            [subField]: value
        }
    }));
  };

  const handleUpdatePersonnel = () => {
     if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim() || !formData.role) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'First Name, Last Name, Email, and Role are required.',
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

    const personnelRef = doc(firestore, 'tenants', tenantId, 'personnel', personnel.id);
    updateDocumentNonBlocking(personnelRef, formData);

    toast({
        title: 'Personnel Updated',
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

  const areAllSelected = useMemo(() => 
    allPermissionIds.length > 0 && formData.permissions?.length === allPermissionIds.length,
    [formData.permissions, allPermissionIds]
  );

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    const currentPermissions = formData.permissions || [];
    const newPermissions = checked 
      ? [...currentPermissions, permissionId] 
      : currentPermissions.filter((id) => id !== permissionId);
    handleInputChange('permissions', newPermissions);
  };

  const handleSelectAllToggle = () => {
    if (areAllSelected) {
      handleInputChange('permissions', []);
    } else {
      handleInputChange('permissions', allPermissionIds);
    }
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

  // --- Licenses Logic ---
  const handleAddLicense = () => {
    const newLicense: License = { name: '', number: '', issueDate: '', expirationDate: '' };
    const newLicenses = [...(formData.licenses || []), newLicense];
    handleInputChange('licenses', newLicenses);
  };

  const handleLicenseChange = (index: number, field: keyof License, value: string) => {
    const newLicenses = [...(formData.licenses || [])];
    newLicenses[index] = { ...newLicenses[index], [field]: value };
    handleInputChange('licenses', newLicenses);
  };

  const handleRemoveLicense = (index: number) => {
    const newLicenses = (formData.licenses || []).filter((_, i) => i !== index);
    handleInputChange('licenses', newLicenses);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Personnel</CardTitle>
        <CardDescription>
            Update details for {personnel.firstName} {personnel.lastName}.
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
                      <Label htmlFor="department">Department</Label>
                      <Select onValueChange={(value) => handleInputChange('department', value)} value={formData.department}>
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
                </CollapsibleContent>
              </Collapsible>
              
              <Separator />

              {/* --- Identification --- */}
              <Collapsible open={isIdentificationOpen} onOpenChange={setIsIdentificationOpen}>
                <CollapsibleTrigger asChild>
                  <div className='flex items-center gap-2 mb-4 cursor-pointer'>
                    <h3 className="text-lg font-semibold">Identification</h3>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Date of Birth</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !formData.dateOfBirth && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.dateOfBirth ? format(new Date(formData.dateOfBirth), "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                                onSelect={(date) => handleInputChange('dateOfBirth', date?.toISOString().split('T')[0])}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nationality">Nationality</Label>
                        <Input id="nationality" value={formData.nationality || ''} onChange={(e) => handleInputChange('nationality', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="passportNumber">Passport Number</Label>
                        <Input id="passportNumber" value={formData.passport?.number || ''} onChange={(e) => handleNestedInputChange('passport', 'number', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Passport Expiration</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.passport?.expirationDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.passport?.expirationDate ? format(new Date(formData.passport.expirationDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={formData.passport?.expirationDate ? new Date(formData.passport.expirationDate) : undefined} onSelect={(date) => handleNestedInputChange('passport', 'expirationDate', date?.toISOString().split('T')[0])} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="visaNumber">Visa Number</Label>
                        <Input id="visaNumber" value={formData.visa?.number || ''} onChange={(e) => handleNestedInputChange('visa', 'number', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Visa Expiration</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.visa?.expirationDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.visa?.expirationDate ? format(new Date(formData.visa.expirationDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={formData.visa?.expirationDate ? new Date(formData.visa.expirationDate) : undefined} onSelect={(date) => handleNestedInputChange('visa', 'expirationDate', date?.toISOString().split('T')[0])} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

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

              <Separator />

              {/* --- Licenses --- */}
              <Collapsible open={isLicensesOpen} onOpenChange={setIsLicensesOpen}>
                <CollapsibleTrigger asChild>
                  <div className='flex items-center gap-2 mb-4 cursor-pointer'>
                    <h3 className="text-lg font-semibold">Licenses</h3>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  {(formData.licenses || []).map((license, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4 relative">
                       <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => handleRemoveLicense(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label>License Name</Label>
                              <Input value={license.name} onChange={(e) => handleLicenseChange(index, 'name', e.target.value)} placeholder="e.g., Private Pilot License"/>
                          </div>
                          <div className="space-y-2">
                              <Label>License Number</Label>
                              <Input value={license.number} onChange={(e) => handleLicenseChange(index, 'number', e.target.value)} />
                          </div>
                           <div className="space-y-2">
                              <Label>Issue Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !license.issueDate && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {license.issueDate ? format(new Date(license.issueDate), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={license.issueDate ? new Date(license.issueDate) : undefined} onSelect={(date) => handleLicenseChange(index, 'issueDate', date?.toISOString().split('T')[0] || '')} initialFocus />
                                </PopoverContent>
                              </Popover>
                          </div>
                          <div className="space-y-2">
                              <Label>Expiration Date</Label>
                               <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !license.expirationDate && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {license.expirationDate ? format(new Date(license.expirationDate), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={license.expirationDate ? new Date(license.expirationDate) : undefined} onSelect={(date) => handleLicenseChange(index, 'expirationDate', date?.toISOString().split('T')[0] || '')} initialFocus />
                                </PopoverContent>
                              </Popover>
                          </div>
                       </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={handleAddLicense}>
                    <PlusCircle className="mr-2" /> Add License
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* --- Documents --- */}
              <Collapsible open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
                <CollapsibleTrigger asChild>
                  <div className='flex items-center gap-2 mb-4 cursor-pointer'>
                    <h3 className="text-lg font-semibold">Documents</h3>
                     <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className='p-4 border rounded-lg flex flex-col gap-4'>
                    <p className='text-sm text-muted-foreground'>
                      Document upload functionality is not yet implemented. This is a placeholder for where you would manage user-specific files.
                    </p>
                    <div className='flex items-center gap-2'>
                        <Input type='file' disabled/>
                        <Button disabled>Upload</Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

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
                                                                checked={(formData.permissions || []).includes(permissionId)}
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
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleUpdatePersonnel}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
