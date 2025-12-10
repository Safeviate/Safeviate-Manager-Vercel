
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, View } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

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
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  
  const isImage = (url: string) => {
    return url.startsWith('data:image/');
  };

  return (
    <div className="space-y-6">
       {/* --- Contact & Role --- */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Contact & Role</CardTitle>
            </div>
            <Badge>{user.userType}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- Address --- */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
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

      {/* Document Viewer Dialog */}
        <Dialog open={!!viewingDocument} onOpenChange={(open) => !open && setViewingDocument(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{viewingDocument?.name || 'Document'}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 border rounded-lg bg-muted/50 flex items-center justify-center relative">
                     {viewingDocument && isImage(viewingDocument.url) ? (
                        <Image 
                            src={viewingDocument.url} 
                            alt={viewingDocument.name}
                            fill
                            className="object-contain"
                        />
                     ) : viewingDocument ? (
                        <div className="text-center p-8">
                            <p className='text-lg font-semibold mb-2'>Cannot preview this file type.</p>
                            <p className="text-muted-foreground mb-4">You can download it to view it locally.</p>
                            <Button asChild>
                                <a href={viewingDocument.url} download={viewingDocument.name} target="_blank" rel="noopener noreferrer">
                                    Download &quot;{viewingDocument.name}&quot;
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <p>No document selected</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
