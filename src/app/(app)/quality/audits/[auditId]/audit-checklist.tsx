
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { QualityAudit, QualityAuditChecklistTemplate, QualityFinding, AuditFinding, ChecklistSection, AuditChecklistItem } from '@/types/quality';
import { DocumentUploader } from '../../../users/personnel/[id]/document-uploader';
import { FileUp, Camera, Trash2, ZoomIn, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type EnrichedAudit = QualityAudit & { template: QualityAuditChecklistTemplate };

interface AuditChecklistProps {
  audit: EnrichedAudit;
  tenantId: string;
}

const evidenceSchema = z.object({
  url: z.string(),
  description: z.string().min(1, 'Description is required.'),
});

const findingSchema = z.object({
  checklistItemId: z.string(),
  finding: z.enum(['Compliant', 'Non Compliant', 'Observation', 'Not Applicable']),
  comment: z.string().optional(),
  suggestedImprovements: z.string().optional(),
  level: z.string().optional(),
  evidence: z.array(evidenceSchema).optional(),
});

const formSchema = z.object({
  findings: z.array(findingSchema),
});

type FormValues = z.infer<typeof formSchema>;

export function AuditChecklist({ audit, tenantId }: AuditChecklistProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
    const [activeItemId, setActiveItemId] = useState<string | null>(null);

    const allChecklistItems = audit.template.sections.flatMap(section => section.items);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            findings: allChecklistItems.map(item => {
                const existingFinding = audit.findings.find(f => f.checklistItemId === item.id);
                return existingFinding || { 
                    checklistItemId: item.id, 
                    finding: 'Compliant', 
                    comment: '',
                    suggestedImprovements: '',
                    evidence: [] 
                };
            })
        },
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: 'findings',
        keyName: 'formId'
    });

    const onSubmit = (values: FormValues) => {
        if (!firestore) return;
        const auditRef = doc(firestore, `tenants/${tenantId}/quality-audits`, audit.id);
        const filledFindings = values.findings.filter(f => f.finding);
        updateDocumentNonBlocking(auditRef, { findings: filledFindings });
        toast({ title: "Findings Saved", description: "Your audit findings have been saved." });
    };

    const handleViewImage = (url: string) => {
        setViewingImageUrl(url);
        setIsImageViewerOpen(true);
    };

    const handleEvidenceUploaded = (docDetails: { name: string; url: string; }) => {
        if (!activeItemId) return;
        
        const activeItemIndex = form.getValues('findings').findIndex(f => f.checklistItemId === activeItemId);
        if (activeItemIndex === -1) return;

        const currentEvidence = form.getValues(`findings.${activeItemIndex}.evidence`) || [];
        form.setValue(`findings.${activeItemIndex}.evidence`, [...currentEvidence, { url: docDetails.url, description: docDetails.name }]);
    };
    
    const activeItemFinding = form.watch(`findings.${form.getValues('findings').findIndex(f => f.checklistItemId === activeItemId)}.finding`);
    const isEvidenceDisabled = !activeItemId || activeItemFinding === 'Compliant' || activeItemFinding === 'Not Applicable';


    const renderChecklistItem = (item: AuditChecklistItem) => {
        const itemIndex = form.getValues('findings').findIndex(f => f.checklistItemId === item.id);
        if (itemIndex === -1) return null;

        const findingType = form.watch(`findings.${itemIndex}.finding`);
        const { fields: evidenceFields, remove: removeEvidence } = useFieldArray({
            control: form.control,
            name: `findings.${itemIndex}.evidence`
        });
        
        return (
            <Card 
                key={item.id} 
                className={cn("mb-4 cursor-pointer transition-shadow", activeItemId === item.id && "shadow-lg ring-2 ring-primary")}
                onClick={() => setActiveItemId(item.id)}
            >
                <CardHeader>
                    <CardTitle className="text-base">{item.text}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <FormField
                        control={form.control}
                        name={`findings.${itemIndex}.finding`}
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-4">
                                        {(['Compliant', 'Non Compliant', 'Observation', 'Not Applicable'] as AuditFinding[]).map(value => (
                                            <FormItem key={value} className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value={value} /></FormControl>
                                                <FormLabel className="font-normal">{value}</FormLabel>
                                            </FormItem>
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <Separator />

                    <div className="space-y-4">
                         <FormField control={form.control} name={`findings.${itemIndex}.comment`} render={({ field }) => (<FormItem><FormLabel>Comment / Details</FormLabel><FormControl><Textarea placeholder="Provide details about the finding..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name={`findings.${itemIndex}.suggestedImprovements`} render={({ field }) => (<FormItem><FormLabel>Suggested Improvements</FormLabel><FormControl><Textarea placeholder="Suggest any improvements..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                        {(findingType === 'Non Compliant' || findingType === 'Observation') && (
                            <div className="mt-4 space-y-4">
                                {findingType === 'Non Compliant' && (
                                    <FormField control={form.control} name={`findings.${itemIndex}.level`} render={({ field }) => ( <FormItem><FormLabel>Finding Level</FormLabel><FormControl><Input placeholder="e.g., Level 1, Level 2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                )}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <FormLabel>Evidence</FormLabel>
                                    </div>
                                    <div className="space-y-4 pt-2">
                                        {evidenceFields.map((evidence, evidenceIndex) => (
                                            <div key={evidence.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                                <div className="relative group flex-shrink-0">
                                                    <Image src={evidence.url} alt={`Evidence ${evidenceIndex + 1}`} width={80} height={80} className="rounded-md aspect-square object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-md" onClick={() => handleViewImage(evidence.url)}>
                                                        <ZoomIn className="h-6 w-6 text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <FormField control={form.control} name={`findings.${itemIndex}.evidence.${evidenceIndex}.description`} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Description</FormLabel><FormControl><Input placeholder="Briefly describe the evidence" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-4 text-destructive hover:text-destructive" onClick={() => removeEvidence(evidenceIndex)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    {evidenceFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No evidence attached.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {audit.template.sections.map((section) => (
                        <div key={section.id}>
                            <h2 className="text-xl font-semibold mt-8 mb-4 border-b pb-2">{section.title}</h2>
                            {section.items.map(item => renderChecklistItem(item))}
                        </div>
                    ))}
                    <div className="flex justify-end sticky bottom-0 py-4 bg-background z-10 gap-2">
                        <DocumentUploader
                          onDocumentUploaded={handleEvidenceUploaded}
                          trigger={(openDialog) => (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" disabled={isEvidenceDisabled}>
                                  <PlusCircle className="mr-2 h-4 w-4" /> Add Evidence
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => openDialog('file')}><FileUp className="mr-2 h-4 w-4" />Upload File</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openDialog('camera')}><Camera className="mr-2 h-4 w-4" />Take Photo</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        />
                        <Button type="submit">Save Findings</Button>
                    </div>
                </form>
            </Form>
            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader><DialogTitle>Evidence Viewer</DialogTitle></DialogHeader>
                    {viewingImageUrl && <div className="relative h-[80vh]"><Image src={viewingImageUrl} alt="Evidence" fill style={{ objectFit: 'contain' }}/></div>}
                </DialogContent>
            </Dialog>
        </>
    );
}

