'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel } from '../page';
import type { Role } from '../../roles/page';
import type { Department } from '../../../admin/department/page';

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

  const getPermissionName = (permissionId: string) => {
    const [resourceId, action] = permissionId.split('-');
    const resource = permissionsConfig.find(p => p.id === resourceId);
    return resource ? `${resource.name}: ${action}` : permissionId;
  };

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
        <CardHeader>
            <CardTitle>Assigned Permissions</CardTitle>
        </CardHeader>
        <CardContent>
            {personnel.permissions && personnel.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {personnel.permissions.map(permissionId => (
                        <Badge key={permissionId} variant="secondary">
                            {getPermissionName(permissionId)}
                        </Badge>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground">No custom permissions assigned. Inherits all permissions from the role.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
