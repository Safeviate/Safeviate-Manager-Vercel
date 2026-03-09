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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
            <Card key={item.id} className="mb-3 md:mb-4">
                <CardHeader className="py-3 md:py-4">
                    <CardTitle className="text-sm md:text-base">{item.text}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-6 pb-4">
                     <div className='flex flex-wrap justify-between items-start gap-4'>
                        <FormField
                            control={form.control}
                            name={`findings.${itemIndex}.finding`}
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            form.setValue(`findings.${itemIndex}.level`, '');
                                        }}
                                        defaultValue={field.value}
                                        className="flex flex-wrap gap-x-4 gap-y-2"
                                        disabled={isReadOnly}
                                        >
                                            {(['Compliant', 'Non Compliant', 'Not Applicable'] as const).map(value => (
                                                <FormItem key={value} className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value={value} /></FormControl>
                                                    <FormLabel className="font-normal text-xs md:text-sm">{value}</FormLabel>
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
                                    <Badge variant={openActionsCount > 0 ? 'destructive' : 'default'} className="text-[10px]">
                                        {openActionsCount} Open Action(s)
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px]">CAP Pending</Badge>
                                )}
                                 <Button variant="secondary" size="sm" onClick={() => handleOpenCapDialog(item.id, item.text)} className="h-7 text-[10px]">
                                    <Edit className="mr-1.5 h-3 w-3" />
                                    Manage CAP
                                </Button>
                            </div>
                        )}
                     </div>
                    
                    <Separator />

                    <div className="space-y-3 md:space-y-4">
                         <FormField control={form.control} name={`findings.${itemIndex}.comment`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Comment / Details</FormLabel><FormControl><Textarea placeholder="Provide details..." {...field} disabled={isReadOnly} className="min-h-[60px] text-xs" /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name={`findings.${itemIndex}.suggestedImprovements`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Suggested Improvements</FormLabel><FormControl><Textarea placeholder="Improvements..." {...field} disabled={isReadOnly} className="min-h-[60px] text-xs" /></FormControl><FormMessage /></FormItem>)} />

                        {(findingType === 'Compliant' || findingType === 'Non Compliant') && (
                            <div className="mt-3 space-y-3">
                                <FormField
                                    control={form.control}
                                    name={`findings.${itemIndex}.level`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Finding Level</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                                                <FormControl>
                                                    <SelectTrigger
                                                        style={{
                                                            backgroundColor: field.value ? selectedLevel?.color : undefined,
                                                            color: field.value ? selectedLevel?.foregroundColor : undefined,
                                                        }}
                                                        className={cn("h-8 text-xs", !field.value && 'text-muted-foreground')}
                                                    >
                                                        <SelectValue placeholder="Select level" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {findingType === 'Compliant' && observationLevel && (
                                                        <SelectItem value={observationLevel.name}>{observationLevel.name}</SelectItem>
                                                    )}
                                                    {findingType === 'Non Compliant' && otherLevels.map(level => (
                                                        <SelectItem key={level.id} value={level.name}>
                                                            {level.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <FormLabel className="text-xs">Evidence</FormLabel>
                                        {!isReadOnly && (
                                            <DocumentUploader
                                            onDocumentUploaded={(docDetails) => handleEvidenceUploaded(item.id, docDetails)}
                                            trigger={(openDialog) => (
                                                <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]">
                                                    Add Evidence
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDialog('file');}}><FileUp className="mr-2 h-4 w-4" />Upload File</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDialog('camera');}}><Camera className="mr-2 h-4 w-4" />Take Photo</DropdownMenuItem>
                                                </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2 pt-1">
                                        {evidenceFields.map((evidence, evidenceIndex) => (
                                            <div key={evidence.id} className="flex items-center gap-3 p-2 border rounded-lg bg-background/50">
                                                <div className="relative group flex-shrink-0">
                                                    <Image src={evidence.url} alt="Evidence" width={40} height={40} className="rounded-md aspect-square object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-md" onClick={() => handleViewImage(evidence.url)}>
                                                        <ZoomIn className="h-4 w-4 text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <FormField control={form.control} name={`findings.${itemIndex}.evidence.${evidenceIndex}.description`} render={({ field }) => ( <FormItem className="space-y-0"><FormControl><Input placeholder="Description" {...field} disabled={isReadOnly} className="h-7 text-xs border-none shadow-none p-0 focus-visible:ring-0" /></FormControl></FormItem> )}/>
                                                </div>
                                                {!isReadOnly && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeEvidence(evidenceIndex)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                            </div>
                                        ))}
                                    </div>
                                    {evidenceFields.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2 italic">No evidence attached.</p>}
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                    {audit.template.sections.map((section) => (
                        <div key={section.id}>
                            <h2 className="text-lg md:text-xl font-semibold mt-4 md:mt-8 mb-2 md:mb-4 border-b pb-2">{section.title}</h2>
                            {section.items.map(item => renderChecklistItem(item))}
                        </div>
                    ))}
                    {!isReadOnly && (
                        <div className="flex justify-end sticky bottom-0 py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 gap-2 border-t mt-8">
                            <Button type="submit" variant="outline" size="sm" className="h-9 px-4">Save Progress</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="default" size="sm" className="h-9 px-4">Finalize Audit</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to finalize?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will calculate the compliance score, create Corrective Action Plans for any non-compliant findings, and lock the audit from further edits. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleFinalizeAudit}>
                                            Yes, Finalize Audit
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </form>
            </Form>
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
        </>
    );
}
