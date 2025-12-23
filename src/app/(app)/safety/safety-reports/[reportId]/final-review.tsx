'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, ReportHazard } from '@/types/safety-report';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, Signature } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '@/components/ui/separator';

const riskAssessmentSchema = z.object({
    severity: z.number().min(1).max(5),
    likelihood: z.number().min(1).max(5),
    riskScore: z.number(),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const reportHazardSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Hazard description is required."),
    riskAssessment: riskAssessmentSchema.optional(),
});

const finalReviewSchema = z.object({
  mitigatedHazards: z.array(reportHazardSchema),
  signatures: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    role: z.string(),
    signatureUrl: z.string(),
    signedAt: z.string(),
  })),
});

type FinalReviewFormValues = z.infer<typeof finalReviewSchema>;

interface FinalReviewProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
}

export function FinalReview({ report, tenantId, personnel }: FinalReviewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FinalReviewFormValues>({
    resolver: zodResolver(finalReviewSchema),
    defaultValues: {
      mitigatedHazards: report.mitigatedHazards || [],
      signatures: report.signatures || [],
    },
  });
  
  const { fields: hazardFields, append: appendHazard, remove: removeHazard } = useFieldArray({
      control: form.control,
      name: "mitigatedHazards"
  });

  const onSubmit = (values: FinalReviewFormValues) => {
    if (!firestore) return;
    const reportRef = doc(firestore, 'tenants', tenantId, 'safety-reports', report.id);
    updateDocumentNonBlocking(reportRef, values);
    toast({ title: 'Final Review Updated' });
  };
  
  const handleSignReport = () => {
    // In a real app, this would open a signature pad modal.
    // For now, we'll just add a placeholder signature.
    const currentUser = personnel[0]; // Placeholder for logged-in user
    if (!currentUser) {
        toast({variant: "destructive", title: "Cannot Sign", description: "No user available to sign."});
        return;
    }

    const newSignature = {
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        role: "Safety Manager", // Placeholder
        signatureUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/Pj2IeAAAAABJRU5ErkJggg==", // 1x1 transparent png
        signedAt: new Date().toISOString(),
    };
    
    const currentSignatures = form.getValues('signatures') || [];
    form.setValue('signatures', [...currentSignatures, newSignature]);

    // This would typically be part of the main form submit, but we can save it directly.
    const reportRef = doc(firestore, 'tenants', tenantId, 'safety-reports', report.id);
    updateDocumentNonBlocking(reportRef, { signatures: [...currentSignatures, newSignature] });

    toast({title: "Report Signed"});
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Final Review & Closure</CardTitle>
            <CardDescription>Review the final state of hazards and provide sign-off to close the report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Mitigated Hazards</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendHazard({ id: uuidv4(), description: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Hazard
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Re-assess hazards after corrective actions have been implemented.</p>
                <div className='space-y-4'>
                    {hazardFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2 p-4 border rounded-lg">
                             <p className="flex-1 text-sm">{field.description || "New Hazard"}</p>
                            {/* Placeholder for risk matrix */}
                             <div className="w-48 h-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
                                Risk Matrix
                            </div>
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeHazard(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                </div>
            </div>

            <Separator />
            
            <div>
                <h3 className="text-lg font-medium mb-4">Signatures</h3>
                <div className="space-y-4">
                    {(form.watch('signatures') || []).map((sig, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <p className="font-semibold">{sig.userName}</p>
                                <p className="text-sm text-muted-foreground">{sig.role}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{new Date(sig.signedAt).toLocaleString()}</p>
                        </div>
                    ))}
                    {form.watch('signatures')?.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No signatures yet.</p>
                    )}
                </div>
                <div className="mt-4 flex justify-end">
                    <Button type="button" onClick={handleSignReport}>
                        <Signature className="mr-2 h-4 w-4" /> Sign and Close Report
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
