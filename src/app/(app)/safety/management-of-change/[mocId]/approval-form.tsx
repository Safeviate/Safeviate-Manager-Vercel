'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange, MocSignature } from '@/types/moc';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { SignaturePad } from '@/components/ui/signature-pad';
import { format } from 'date-fns';
import Image from 'next/image';

const signatureSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  role: z.string().min(1, 'Role is required'),
  signatureUrl: z.string().min(1, 'Signature is required'),
  signedAt: z.string(),
});

const approvalFormSchema = z.object({
  signatures: z.array(signatureSchema),
});

type ApprovalFormValues = z.infer<typeof approvalFormSchema>;

interface ApprovalFormProps {
  moc: ManagementOfChange;
  tenantId: string;
  personnel: Personnel[];
}

export function ApprovalForm({ moc, tenantId, personnel }: ApprovalFormProps) {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const [signingRole, setSigningRole] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const form = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      signatures: moc.signatures || [],
    },
  });
  
  const { fields: signatureFields, append } = useFieldArray({
      control: form.control,
      name: "signatures",
  });

  const handleSign = () => {
    if (!authUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to sign.' });
      return;
    }
    if (!signingRole.trim()) {
        toast({ variant: 'destructive', title: 'Role Required', description: 'Please enter your role at the time of signing.' });
        return;
    }
    if (!signatureDataUrl) {
        toast({ variant: 'destructive', title: 'Signature Required', description: 'Please provide your signature.' });
        return;
    }

    const currentUser = personnel.find(p => p.id === authUser.uid);
    
    const newSignature: MocSignature = {
        userId: authUser.uid,
        userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : authUser.displayName || 'Unknown User',
        role: signingRole,
        signatureUrl: signatureDataUrl,
        signedAt: new Date().toISOString(),
    };
    
    const updatedSignatures = [...(moc.signatures || []), newSignature];
    
    const mocRef = doc(firestore, 'tenants', tenantId, 'management-of-change', moc.id);
    updateDocumentNonBlocking(mocRef, { signatures: updatedSignatures });
    
    append(newSignature);

    toast({ title: 'MOC Signed', description: 'Your signature has been recorded.' });
    
    setSigningRole('');
    setSignatureDataUrl(null);
  };
  
  const currentUserHasSigned = moc.signatures?.some(sig => sig.userId === authUser?.uid);

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Approval & Sign-off</CardTitle>
            <CardDescription>
              Review and provide digital sign-off to approve this Management of Change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div>
                  <h3 className="text-lg font-medium mb-4">Recorded Signatures</h3>
                  <div className="space-y-4">
                      {signatureFields.length > 0 ? signatureFields.map((sig, index) => (
                          <div key={sig.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                              <div>
                                  <p className="font-semibold">{sig.userName}</p>
                                  <p className="text-sm text-muted-foreground">{sig.role}</p>
                              </div>
                              <div className="text-right">
                                  <Image src={sig.signatureUrl} alt={`${sig.userName}'s signature`} width={150} height={75} className="bg-white border rounded-md p-1" />
                                  <p className="text-xs text-muted-foreground mt-1">Signed on {format(new Date(sig.signedAt), 'PPP p')}</p>
                              </div>
                          </div>
                      )) : (
                          <p className="text-center text-muted-foreground py-4">No signatures yet.</p>
                      )}
                  </div>
              </div>

              {!currentUserHasSigned && (
                <div className="pt-6 border-t">
                    <h3 className="text-lg font-medium mb-4">Add Your Signature</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="signing-role">Your Role</Label>
                            <Input 
                                id="signing-role"
                                placeholder="e.g., Chief Pilot, Safety Manager"
                                value={signingRole}
                                onChange={(e) => setSigningRole(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                             <Label>Signature</Label>
                             <SignaturePad 
                                onSignatureEnd={(dataUrl) => setSignatureDataUrl(dataUrl)}
                                height={150}
                                width={350}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button type="button" onClick={handleSign}>Sign and Approve</Button>
                    </div>
                </div>
              )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
