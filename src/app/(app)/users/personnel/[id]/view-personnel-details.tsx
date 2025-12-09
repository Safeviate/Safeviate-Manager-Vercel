'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel } from '../page';
import type { Role } from '../../../roles/page';
import type { Department } from '../../../admin/department/page';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Award } from 'lucide-react';
import { format } from 'date-fns';

interface ViewPersonnelDetailsProps {
  personnel: Personnel;
  role: Role | null;
  department: Department | null;
}

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value || 'N/A'}</p>
    </div>
);

export function ViewPersonnelDetails({ personnel, role, department }: ViewPersonnelDetailsProps) {
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  return (
    <div className="space-y-6">
       {/* --- Contact & Role --- */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Contact & Role</CardTitle>
            </div>
            <Badge>{personnel.userType}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailItem label="First Name" value={personnel.firstName} />
          <DetailItem label="Last Name" value={personnel.lastName} />
          <DetailItem label="Email" value={personnel.email} />
          <DetailItem label="Contact Number" value={personnel.contactNumber} />
          <DetailItem label="Department" value={department?.name} />
          <DetailItem label="Role" value={role?.name} />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- Identification --- */}
        <Card>
            <CardHeader>
                <CardTitle>Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <DetailItem label="Date of Birth" value={personnel.dateOfBirth ? format(new Date(personnel.dateOfBirth), 'PPP') : 'N/A'} />
                <DetailItem label="Nationality" value={personnel.nationality} />
                <DetailItem label="Passport Number" value={personnel.passport?.number} />
                <DetailItem label="Passport Expiration" value={personnel.passport?.expirationDate ? format(new Date(personnel.passport.expirationDate), 'PPP') : 'N/A'} />
                <DetailItem label="Visa Number" value={personnel.visa?.number} />
                <DetailItem label="Visa Expiration" value={personnel.visa?.expirationDate ? format(new Date(personnel.visa.expirationDate), 'PPP') : 'N/A'} />
            </CardContent>
        </Card>

        {/* --- Address --- */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem label="Street" value={personnel.address?.street} />
            <DetailItem label="City" value={personnel.address?.city} />
            <DetailItem label="State / Province" value={personnel.address?.state} />
            <DetailItem label="Postal Code" value={personnel.address?.postalCode} />
            <DetailItem label="Country" value={personnel.address?.country} />
          </CardContent>
        </Card>

        {/* --- Emergency Contact --- */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem label="Name" value={personnel.emergencyContact?.name} />
            <DetailItem label="Relationship" value={personnel.emergencyContact?.relationship} />
            <DetailItem label="Phone" value={personnel.emergencyContact?.phone} />
          </CardContent>
        </Card>
      </div>

       {/* --- Licenses --- */}
      <Card>
        <CardHeader>
            <CardTitle>Licenses</CardTitle>
        </CardHeader>
        <CardContent>
            {personnel.licenses && personnel.licenses.length > 0 ? (
                 <div className="space-y-4">
                    {personnel.licenses.map((license, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                           <Award className="h-6 w-6 text-muted-foreground mt-1"/>
                           <div className='grid grid-cols-2 gap-x-8 gap-y-2 flex-1'>
                             <DetailItem label="License Name" value={license.name} />
                             <DetailItem label="License Number" value={license.number} />
                             <DetailItem label="Issue Date" value={license.issueDate ? format(new Date(license.issueDate), 'PPP') : 'N/A'} />
                             <DetailItem label="Expiration Date" value={license.expirationDate ? format(new Date(license.expirationDate), 'PPP') : 'N/A'} />
                           </div>
                        </div>
                    ))}
                 </div>
            ) : (
                <p className="text-muted-foreground">No licenses on file.</p>
            )}
        </CardContent>
      </Card>
      
      {/* --- Documents --- */}
      <Card>
        <CardHeader>
            <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
             <p className="text-muted-foreground">No documents uploaded.</p>
        </CardContent>
      </Card>

      {/* --- Permissions --- */}
      <Card>
        <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <CardTitle>Assigned Permissions</CardTitle>
                     <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                 <Badge variant="secondary">{personnel.permissions?.length || 0} assigned</Badge>
            </CardHeader>
            <CollapsibleContent>
                <CardContent>
                    {personnel.permissions && personnel.permissions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                           {permissionsConfig.map((resource) => {
                                const assignedActions = resource.actions.filter(action => 
                                    personnel.permissions.includes(`${resource.id}-${action}`)
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
    </div>
  );
}
