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
import { doc, writeBatch, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { QualityAudit, QualityAuditChecklistTemplate, QualityFinding, AuditChecklistItem, CorrectiveActionPlan } from '@/types/quality';
import { DocumentUploader } from '../../../users/personnel/[id]/document-uploader';
import { FileUp, Camera, Trash2, ZoomIn, Edit } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import type { FindingLevel } from '@/app/(app)/admin/features/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { ManageCapDialog } from '../../cap-tracker/manage-cap-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type EnrichedAudit = QualityAudit & { template: QualityAuditChecklistTemplate };
type EnrichedCorrectiveActionPlan = CorrectiveActionPlan & {
  auditNumber: string;
  findingDescription: string;
};

interface AuditChecklistProps {
  audit: EnrichedAudit;
  tenantId: string;
  findingLevels: FindingLevel[];
  caps: CorrectiveActionPlan[];
  personnel: Personnel[];
}

const evidenceSchema = z.object({
  url: z.string(),
  description: z.string().min(1, 'Description is required.'),
});

const findingSchema = z.object({
  checklistItemId: z.string(),
  finding: z.enum(['Compliant', 'Non Compliant', 'Not Applicable']),
  comment: z.string().optional(),
  suggestedImprovements: z.string().optional(),
  level: z.string().optional(),
  evidence: z.array(evidenceSchema).optional(),
});

const formSchema = z.object({
  findings: z.array(findingSchema),
});

type FormValues = z.infer<typeof formSchema>;

export function AuditChecklist({ audit, tenantId, findingLevels, caps, personnel }: AuditChecklistProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

    const [isCapDialogOpen, setIsCapDialogOpen] = useState(false);
    const [selectedCap, setSelectedCap] = useState<EnrichedCorrectiveActionPlan | null>(null);

    const isReadOnly = audit.status === 'Finalized' || audit.status === 'Closed' || audit.status === 'Archived';

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
                    level: '',
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

     const handleOpenCapDialog = (findingId: string, findingDescription: string) => {
        const capForFinding = caps.find(c => c.findingId === findingId);
        if (capForFinding) {
            setSelectedCap({
                ...capForFinding,
                auditNumber: audit.auditNumber,
                findingDescription: findingDescription
            });
            setIsCapDialogOpen(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'CAP Not Found',
                description: 'A corrective action plan has not been generated for this finding yet. Finalize the audit to create it.',
            });
        }
    };


    const onSubmit = (values: FormValues) => {
        if (!firestore) return;
        const auditRef = doc(firestore, `tenants/${tenantId}/quality-audits`, audit.id);
        
        const filledFindings = values.findings.map(f => {
            if (f.finding === 'Not Applicable') {
                 return { ...f, level: undefined };
            }
            return f;
        });

        updateDocumentNonBlocking(auditRef, { findings: filledFindings });
        toast({ title: "Findings Saved", description: "Your audit findings have been saved." });
    };

    const handleFinalizeAudit = async () => {
        if (!firestore) return;
        
        const values = form.getValues();
        const auditRef = doc(firestore, `tenants/${tenantId}/quality-audits`, audit.id);

        const applicableItems = values.findings.filter(f => f.finding !== 'Not Applicable');
        const compliantItems = applicableItems.filter(f => f.finding === 'Compliant');
        const nonCompliantFindings = values.findings.filter(f => f.finding === 'Non Compliant');
        
        const complianceScore = applicableItems.length > 0
            ? Math.round((compliantItems.length / applicableItems.length) * 100)
            : 100;

        try {
            const batch = writeBatch(firestore);

            // 1. Update the audit document
            const auditUpdateData = {
                findings: values.findings,
                status: 'Finalized' as const,
                complianceScore: complianceScore,
            };
            batch.update(auditRef, auditUpdateData);

            // 2. Create CAPs for non-compliant findings
            const capsCollectionRef = collection(firestore, `tenants/${tenantId}/corrective-action-plans`);
            nonCompliantFindings.forEach(finding => {
                const newCapRef = doc(capsCollectionRef);
                const capData: Omit<CorrectiveActionPlan, 'id'> = {
                    auditId: audit.id,
                    findingId: finding.checklistItemId,
                    rootCauseAnalysis: '',
                    status: 'Open',
                    actions: [],
                };
                batch.set(newCapRef, capData);
            });

            await batch.commit();

            toast({
                title: "Audit Finalized",
                description: `Score: ${complianceScore}%. ${nonCompliantFindings.length} corrective action plans created.`
            });

        } catch(error: any) {
             toast({
                variant: "destructive",
                title: "Finalization Failed",
                description: "An error occurred while finalizing the audit and creating CAPs."
            });
        }
    };

    const handleViewImage = (url: string) => {
        setViewingImageUrl(url);
        setIsImageViewerOpen(true);
    };

    const handleEvidenceUploaded = (checklistItemId: string, docDetails: { name: string; url: string; }) => {
        const itemIndex = form.getValues('findings').findIndex(f => f.checklistItemId === checklistItemId);
        if (itemIndex === -1) return;

        const currentEvidence = form.getValues(`findings.${itemIndex}.evidence`) || [];
        form.setValue(`findings.${itemIndex}.evidence`, [...currentEvidence, { url: docDetails.url, description: docDetails.name }]);
    };

    const renderChecklistItem = (item: AuditChecklistItem) => {
        const itemIndex = form.getValues('findings').findIndex(f => f.checklistItemId === item.id);
        if (itemIndex === -1) return null;

        const findingType = form.watch(`findings.${itemIndex}.finding`);
        const { fields: evidenceFields, remove: removeEvidence } = useFieldArray({
            control: form.control,
            name: `findings.${itemIndex}.evidence`
        });
        
        const selectedLevelName = form.watch(`findings.${itemIndex}.level`);
        const selectedLevel = findingLevels.find(l => l.name === selectedLevelName);
        const observationLevel = findingLevels.find(l => l.name === 'Observation');
        const otherLevels = findingLevels.filter(l => l.name !== 'Observation');
        
        const cap = caps.find(c => c.findingId === item.id);
        const openActionsCount = cap?.actions?.filter(a => a.status === 'Open' || a.status === 'In Progress').length || 0;

        return (
            <Card key={item.id} className="mb-4">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm">{item.text}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-3">
                     <div className='flex flex-wrap justify-between items-center gap-2'>
                        <FormField
                            control={form.control}
                            name={`findings.${itemIndex}.finding`}
                            render={({ field }) => (
                                <FormItem className="space-y-0">
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            form.setValue(`findings.${itemIndex}.level`, '');
                                        }}
                                        defaultValue={field.value}
                                        className="flex flex-wrap gap-3"
                                        disabled={isReadOnly}
                                        >
                                            {(['Compliant', 'Non Compliant', 'Not Applicable'] as const).map(value => (
                                                <FormItem key={value} className="flex items-center space-x-1.5 space-y-0">
                                                    <FormControl><RadioGroupItem value={value} className="h-3.5 w-3.5" /></FormControl>
                                                    <FormLabel className="font-normal text-xs">{value}</FormLabel>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {findingType === 'Non Compliant' && audit.status !== 'Scheduled' && audit.status !== 'In Progress' && (
                            <div className='flex items-center gap-2'>
                                {cap ? (
                                    <Badge variant={openActionsCount > 0 ? 'destructive' : 'default'} className="text-[9px] h-5">
                                        {openActionsCount} Open CAP
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[9px] h-5">CAP Pending</Badge>
                                )}
                                 <Button variant="secondary" size="sm" onClick={() => handleOpenCapDialog(item.id, item.text)} className="h-6 text-[9px] px-2">
                                    <Edit className="mr-1 h-2.5 w-2.5" />
                                    CAP
                                </Button>
                            </div>
                        )}
                     </div>
                    
                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         <FormField control={form.control} name={`findings.${itemIndex}.comment`} render={({ field }) => (<FormItem className="space-y-1"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Comment</FormLabel><FormControl><Textarea placeholder="..." {...field} disabled={isReadOnly} className="min-h-[40px] text-xs py-1" /></FormControl></FormItem>)} />
                         <FormField control={form.control} name={`findings.${itemIndex}.suggestedImprovements`} render={({ field }) => (<FormItem className="space-y-1"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Improvements</FormLabel><FormControl><Textarea placeholder="..." {...field} disabled={isReadOnly} className="min-h-[40px] text-xs py-1" /></FormControl></FormItem>)} />
                    </div>

                    {(findingType === 'Compliant' || findingType === 'Non Compliant') && (
                        <div className="pt-2 border-t space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4 items-start">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Evidence</FormLabel>
                                        {!isReadOnly && (
                                            <DocumentUploader
                                            onDocumentUploaded={(docDetails) => handleEvidenceUploaded(item.id, docDetails)}
                                            trigger={(openDialog) => (
                                                <div className="flex gap-2">
                                                    <Button type="button" variant="outline" size="sm" className="h-6 text-[9px]" onClick={() => openDialog('file')}>
                                                        <FileUp className="mr-1 h-3 w-3" /> Add Document
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" className="h-6 text-[9px]" onClick={() => openDialog('camera')}>
                                                        <Camera className="mr-1 h-3 w-3" /> Add Photo
                                                    </Button>
                                                </div>
                                            )}
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {evidenceFields.map((evidence, evidenceIndex) => (
                                            <div key={evidence.id} className="flex items-center gap-2 p-1.5 border rounded bg-background/50">
                                                <div className="relative group flex-shrink-0">
                                                    <Image src={evidence.url} alt="Evidence" width={32} height={32} className="rounded aspect-square object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded" onClick={() => handleViewImage(evidence.url)}>
                                                        <ZoomIn className="h-3 w-3 text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-[80px]">
                                                    <FormField control={form.control} name={`findings.${itemIndex}.evidence.${evidenceIndex}.description`} render={({ field }) => ( <FormItem className="space-y-0"><FormControl><Input placeholder="Desc..." {...field} disabled={isReadOnly} className="h-6 text-[10px] border-none shadow-none p-0 focus-visible:ring-0" /></FormControl></FormItem> )}/>
                                                </div>
                                                {!isReadOnly && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeEvidence(evidenceIndex)}><Trash2 className="h-3 w-3" /></Button>}
                                            </div>
                                        ))}
                                        {evidenceFields.length === 0 && <p className="text-[10px] text-muted-foreground italic">No evidence attached.</p>}
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name={`findings.${itemIndex}.level`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Finding Level</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                                                <FormControl>
                                                    <SelectTrigger
                                                        style={{
                                                            backgroundColor: field.value ? selectedLevel?.color : undefined,
                                                            color: field.value ? selectedLevel?.foregroundColor : undefined,
                                                        }}
                                                        className={cn("h-7 text-[10px]", !field.value && 'text-muted-foreground')}
                                                    >
                                                        <SelectValue placeholder="Select level" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {findingType === 'Compliant' && observationLevel && (
                                                        <SelectItem value={observationLevel.name} className="text-xs">{observationLevel.name}</SelectItem>
                                                    )}
                                                    {findingType === 'Non Compliant' && otherLevels.map(level => (
                                                        <SelectItem key={level.id} value={level.name} className="text-xs">
                                                            {level.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="flex flex-col h-[calc(100vh-300px)] overflow-hidden shadow-none border">
            <CardHeader className="border-b bg-muted/5 shrink-0">
                <CardTitle>Audit Checklist Items</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-8">
                                {audit.template.sections.map((section) => (
                                    <div key={section.id}>
                                        <h2 className="text-base font-bold mb-4 bg-muted/50 px-3 py-1 rounded border-l-4 border-primary sticky top-0 z-10">{section.title}</h2>
                                        <div className="space-y-2">
                                            {section.items.map(item => renderChecklistItem(item))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        {!isReadOnly && (
                            <div className="shrink-0 flex justify-end py-3 bg-muted/10 px-6 gap-2 border-t">
                                <Button type="submit" variant="outline" size="sm" className="h-8 px-4 text-xs">Save Progress</Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="default" size="sm" className="h-8 px-4 text-xs">Finalize Audit</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure you want to finalize?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will calculate the compliance score and lock the audit from further edits.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleFinalizeAudit}>
                                                Finalize Audit
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader><DialogTitle>Evidence Viewer</DialogTitle></DialogHeader>
                    {viewingImageUrl && <div className="relative h-[80vh]"><Image src={viewingImageUrl} alt="Evidence" fill className="object-contain"/></div>}
                </DialogContent>
            </Dialog>
            {selectedCap && (
                <ManageCapDialog
                    isOpen={isCapDialogOpen}
                    onClose={() => setIsCapDialogOpen(false)}
                    cap={selectedCap}
                    tenantId={tenantId}
                    personnel={personnel}
                />
            )}
        </Card>
    );
}
