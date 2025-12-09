'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel } from '../page';
import type { Role } from '../../../roles/page';
import type { Department } from '../../../admin/department/page';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Award, FileText, Upload, Trash2, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { DocumentUploader } from './document-uploader';
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

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
  const firestore = useFirestore();
  const { toast } = useToast();

  const requiredDocuments = role?.requiredDocuments || [];
  const uploadedDocuments = personnel?.documents || [];

  const handleDocumentUploaded = (document: {name: string, url: string, uploadDate: string}) => {
    if (!firestore) return;
    const personnelRef = doc(firestore, 'tenants', 'safeviate', 'personnel', personnel.id);
    const newDocuments = [...uploadedDocuments, document];
    updateDocumentNonBlocking(personnelRef, { documents: newDocuments });
  };

  const handleDeleteDocument = (urlToDelete: string) => {
     if (!firestore) return;
    const personnelRef = doc(firestore, 'tenants', 'safeviate', 'personnel', personnel.id);
    const newDocuments = uploadedDocuments.filter(doc => doc.url !== urlToDelete);
    updateDocumentNonBlocking(personnelRef, { documents: newDocuments });
    toast({
      title: "Document Deleted",
      description: "The document reference has been removed.",
    })
  }

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
        <CardHeader className='flex-row justify-between items-center'>
            <CardTitle>Documents</CardTitle>
             <DocumentUploader 
                onDocumentUploaded={handleDocumentUploaded}
                trigger={
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4"/>
                        Upload Ad-hoc Document
                    </Button>
                }
            />
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <h4 className="text-md font-medium mb-2 text-muted-foreground">Required Documents</h4>
                {requiredDocuments.length > 0 ? (
                    <div className="space-y-2">
                        {requiredDocuments.map(docName => {
                            const isUploaded = uploadedDocuments.some(d => d.name === docName);
                            return (
                                <div key={docName} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/30">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5"/>
                                        <span className="font-medium">{docName}</span>
                                    </div>
                                    <DocumentUploader 
                                        onDocumentUploaded={handleDocumentUploaded}
                                        defaultFileName={docName}
                                        trigger={
                                            <Button size="sm" disabled={isUploaded}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                {isUploaded ? "Uploaded" : "Upload"}
                                            </Button>
                                        }
                                    />
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No specific documents are required by the assigned role.</p>
                )}
            </div>
            
            <Separator />
            
            <div>
                <h4 className="text-md font-medium mb-2 text-muted-foreground">Uploaded Documents</h4>
                {uploadedDocuments.length > 0 ? (
                     <div className="space-y-2">
                        {uploadedDocuments.map(doc => (
                            <div key={doc.url} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className='flex items-center gap-3'>
                                     <LinkIcon className="h-5 w-5 text-muted-foreground"/>
                                     <div>
                                        <p className="font-medium">{doc.name}</p>
                                        <p className="text-xs text-muted-foreground">Uploaded on {format(new Date(doc.uploadDate), 'PPP')}</p>
                                     </div>
                                </div>
                                <Button variant="ghost" size="icon" className='text-destructive' onClick={() => handleDeleteDocument(doc.url)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                     <p className="text-sm text-muted-foreground">No documents have been uploaded.</p>
                )}
            </div>

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
