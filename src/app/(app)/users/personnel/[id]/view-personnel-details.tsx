'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel } from '../page';
import type { Role } from '../../roles/page';
import type { Department } from '../../../admin/department/page';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';

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
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
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
