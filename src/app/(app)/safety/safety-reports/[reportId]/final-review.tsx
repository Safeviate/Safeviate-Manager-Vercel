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
import { PlusCircle, Trash2, Signature, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import React from 'react';
import { cn } from '@/lib/utils';

// --- Helper Functions ---
const getRiskScoreColor = (
    likelihood: number,
    severity: number,
    colors?: Record<string, string>
  ): { backgroundColor: string; color: string } => {
    const severityToLetter: { [key: number]: string } = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    const severityLetter = severityToLetter[severity] || 'E';
    const cellId = `${likelihood}${severityLetter}`;
    
    if (colors && colors[cellId]) {
        const hex = colors[cellId].replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        const textColor = (yiq >= 128) ? 'black' : 'white';
        return { backgroundColor: colors[cellId], color: textColor };
    }
    
    const score = likelihood * severity;
    if (score > 9) return { backgroundColor: '#ef4444', color: 'white' };
    if (score > 4) return { backgroundColor: '#f59e0b', color: 'black' };
    return { backgroundColor: '#10b981', color: 'white' };
};

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

type FormValues = z.infer<typeof finalReviewSchema>;

interface FinalReviewProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
  riskMatrixColors?: Record<string, string>;
  isStacked?: boolean;
}

export function FinalReview({ report, tenantId, personnel, riskMatrixColors, isStacked = false }: FinalReviewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
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

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    const reportRef = doc(firestore, 'tenants', tenantId, 'safety-reports', report.id);
    updateDocumentNonBlocking(reportRef, values);
    toast({ title: 'Final Review Updated' });
  };
  
  const handleSignReport = () => {
    const currentUser = personnel[0]; 
    if (!currentUser) {
        toast({variant: "destructive", title: "Cannot Sign", description: "No user available to sign."});
        return;
    }

    const newSignature = {
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        role: "Safety Manager", 
        signatureUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/Pj2IeAAAAABJRU5ErkJggg==", 
        signedAt: new Date().toISOString(),
    };
    
    const currentSignatures = form.getValues('signatures') || [];
    form.setValue('signatures', [...currentSignatures, newSignature]);

    const reportRef = doc(firestore, 'tenants', tenantId, 'safety-reports', report.id);
    updateDocumentNonBlocking(reportRef, { signatures: [...currentSignatures, newSignature] });

    toast({title: "Report Signed"});
  };

  return (
    <Card className={cn("flex flex-col shadow-none border", !isStacked && "h-[calc(100vh-300px)] overflow-hidden")}>
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <CardTitle>Final Review & Closure</CardTitle>
        <CardDescription>Review the final state of hazards and provide sign-off to close the report.</CardDescription>
      </CardHeader>
      <div className={cn("flex-1 p-0 overflow-hidden", isStacked && "overflow-visible")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
            {isStacked ? (
              <div className="p-6 space-y-10">
                <ReviewFields form={form} hazardFields={hazardFields} removeHazard={removeHazard} appendHazard={appendHazard} riskMatrixColors={riskMatrixColors} handleSignReport={handleSignReport} />
              </div>
            ) : (
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-10">
                  <ReviewFields form={form} hazardFields={hazardFields} removeHazard={removeHazard} appendHazard={appendHazard} riskMatrixColors={riskMatrixColors} handleSignReport={handleSignReport} />
                </div>
              </ScrollArea>
            )}
            <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" /> Save Final Review
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  );
}

function ReviewFields({ form, hazardFields, removeHazard, appendHazard, riskMatrixColors, handleSignReport }: any) {
  return (
    <>
      <div>
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Mitigated Hazards</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => appendHazard({ id: uuidv4(), description: '', riskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })} className="no-print">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Hazard
              </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Re-assess hazards after corrective actions have been implemented.</p>
          <div className='space-y-4'>
              {hazardFields.map((field: any, index: number) => {
                  const likelihood = field.riskAssessment?.likelihood || 1;
                  const severity = field.riskAssessment?.severity || 1;
                  const { backgroundColor, color } = getRiskScoreColor(likelihood, severity, riskMatrixColors);
                  const severityLetters: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
                  const displayValue = `${likelihood}${severityLetters[severity] || 'E'}`;

                  return (
                      <div key={field.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/10">
                          <p className="flex-1 text-sm font-semibold">{field.description || "New Hazard"}</p>
                          <div 
                              className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm"
                              style={{ backgroundColor, color }}
                          >
                              {displayValue}
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeHazard(index)} className="text-destructive no-print"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  );
              })}
              {hazardFields.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-4">No mitigated hazards recorded.</p>}
          </div>
      </div>

      <Separator />
      
      <div>
          <h3 className="text-lg font-medium mb-4">Signatures</h3>
          <div className="space-y-4">
              {(form.watch('signatures') || []).map((sig: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                      <div>
                          <p className="font-semibold">{sig.userName}</p>
                          <p className="text-sm text-muted-foreground">{sig.role}</p>
                      </div>
                      <div className="text-right">
                          <Image src={sig.signatureUrl} alt="Signature" width={100} height={50} className="bg-white border rounded p-1 ml-auto" />
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(sig.signedAt).toLocaleString()}</p>
                      </div>
                  </div>
              ))}
              {form.watch('signatures')?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No signatures yet.</p>
              )}
          </div>
          <div className="mt-4 flex justify-end no-print">
              <Button type="button" onClick={handleSignReport} variant="outline">
                  <Signature className="mr-2 h-4 w-4" /> Sign and Close Report
              </Button>
          </div>
      </div>
    </>
  );
}
