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
import type { QualityAudit, QualityAuditChecklistTemplate, AuditChecklistItem, CorrectiveActionPlan } from '@/types/quality';
import { DocumentUploader } from '../../../users/personnel/[id]/document-uploader';
import { FileUp, Camera, Trash2, ZoomIn, Edit, Save, ShieldCheck } from 'lucide-react';
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
        toast({ title: "Findings Saved", description: "Your audit progress has been recorded." });
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

            const auditUpdateData = {
                findings: values.findings,
                status: 'Finalized' as const,
                complianceScore: complianceScore,
            };
            batch.update(auditRef, auditUpdateData);

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
                description: `Score: ${complianceScore}%. ${nonCompliantFindings.length} CAPs created.`
            });

        } catch(error: any) {
             toast({
                variant: "destructive",
                title: "Finalization Failed",
                description: error.message
            });
        }
    };

    const handleViewImage = (url: string) => {
        setViewingImageUrl(url);
        setIsImageViewerOpen(true);
    };

    const handleEvidenceUploaded = (checklistItemId: string, docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
        const itemIndex = form.getValues('findings').findIndex(f => f.checklistItemId === checklistItemId);
        if (itemIndex === -1) return;

        const currentEvidence = form.getValues(`findings.${itemIndex}.evidence`) || [];
        form.setValue(`findings.${itemIndex}.evidence`, [...currentEvidence, { url: docDetails.url, description: docDetails.name }]);
    };

    const renderChecklistItem = (item: AuditChecklistItem) => {
        const itemIndex = form.getValues('findings').findIndex(f => f.checklistItemId === item.id);
        if (itemIndex === -1) return null;

        const findingType = form.watch(`findings.${itemIndex}.finding`);
        const evidence = form.watch(`findings.${itemIndex}.evidence`) || [];
        
        const selectedLevelName = form.watch(`findings.${itemIndex}.level`);
        const selectedLevel = findingLevels.find(l => l.name === selectedLevelName);
        const observationLevel = findingLevels.find(l => l.name === 'Observation');
        const otherLevels = findingLevels.filter(l => l.name !== 'Observation');
        
        const cap = caps.find(c => c.findingId === item.id);
        const openActionsCount = cap?.actions?.filter(a => a.status === 'Open' || a.status === 'In Progress').length || 0;

        return (
            <Card key={item.id} className="mb-4 shadow-sm border-muted transition-colors hover:border-primary/20">
                <CardHeader className="py-3 px-4 flex flex-row items-start justify-between gap-4">
                    <CardTitle className="text-sm font-medium leading-relaxed">{item.text}</CardTitle>
                    {item.regulationReference && <Badge variant="outline" className="text-[9px] h-5 py-0 shrink-0 font-mono">{item.regulationReference}</Badge>}
                </CardHeader>
                <CardContent className="space-y-4 px-4 pb-4">
                     <div className='flex flex-wrap justify-between items-center gap-4'>
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
                                        className="flex flex-wrap gap-4"
                                        disabled={isReadOnly}
                                        >
                                            {(['Compliant', 'Non Compliant', 'Not Applicable'] as const).map(value => (
                                                <FormItem key={value} className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value={value} /></FormControl>
                                                    <FormLabel className="font-normal text-xs cursor-pointer">{value}</FormLabel>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        {findingType === 'Non Compliant' && audit.status !== 'Scheduled' && audit.status !== 'In Progress' && (
                            <div className='flex items-center gap-2'>
                                {cap ? (
                                    <Badge variant={openActionsCount > 0 ? 'destructive' : 'default'} className="text-[9px] h-5">
                                        {openActionsCount} Open Actions
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[9px] h-5">CAP Pending</Badge>
                                )}
                                 <Button variant="secondary" size="sm" onClick={() => handleOpenCapDialog(item.id, item.text)} className="h-7 text-[10px] px-3 gap-1.5">
                                    <Edit className="h-3 w-3" />
                                    Manage CAP
                                </Button>
                            </div>
                        )}
                     </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                         <FormField control={form.control} name={`findings.${itemIndex}.comment`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Notes / Observations</FormLabel><FormControl><Textarea placeholder="Details about current compliance status..." {...field} disabled={isReadOnly} className="min-h-[60px] text-xs" /></FormControl></FormItem>)} />
                         <FormField control={form.control} name={`findings.${itemIndex}.suggestedImprovements`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Suggested Improvements</FormLabel><FormControl><Textarea placeholder="Recommendations for performance enhancement..." {...field} disabled={isReadOnly} className="min-h-[60px] text-xs" /></FormControl></FormItem>)} />
                    </div>

                    {(findingType === 'Compliant' || findingType === 'Non Compliant') && (
                        <div className="pt-2 border-t space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6 items-start">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Supporting Evidence</FormLabel>
                                        {!isReadOnly && (
                                            <div className="flex gap-2">
                                                <DocumentUploader
                                                    restrictedMode="file"
                                                    onDocumentUploaded={(docDetails) => handleEvidenceUploaded(item.id, docDetails)}
                                                    trigger={(openDialog) => (
                                                        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => openDialog('file')}>
                                                            <FileUp className="mr-1.5 h-3.5 w-3.5" /> File
                                                        </Button>
                                                    )}
                                                />
                                                <DocumentUploader
                                                    restrictedMode="camera"
                                                    onDocumentUploaded={(docDetails) => handleEvidenceUploaded(item.id, docDetails)}
                                                    trigger={(openDialog) => (
                                                        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => openDialog('camera')}>
                                                            <Camera className="mr-1.5 h-3.5 w-3.5" /> Photo
                                                        </Button>
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {evidence.map((ev, evidenceIndex) => (
                                            <div key={evidenceIndex} className="flex items-center gap-3 p-2 border rounded-lg bg-muted/20 group">
                                                <div className="relative h-10 w-10 flex-shrink-0">
                                                    <Image src={ev.url} alt="Evidence" fill className="rounded object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded" onClick={() => handleViewImage(ev.url)}>
                                                        <ZoomIn className="h-4 w-4 text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-[100px] text-[10px] font-medium truncate">
                                                    {ev.description}
                                                </div>
                                                {!isReadOnly && (
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" 
                                                        onClick={() => {
                                                            const newEvidence = [...evidence];
                                                            newEvidence.splice(evidenceIndex, 1);
                                                            form.setValue(`findings.${itemIndex}.evidence`, newEvidence);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {evidence.length === 0 && <p className="text-[10px] text-muted-foreground italic py-2">No evidence attached.</p>}
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name={`findings.${itemIndex}.level`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Finding Classification</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                                                <FormControl>
                                                    <SelectTrigger
                                                        style={{
                                                            backgroundColor: field.value ? selectedLevel?.color : undefined,
                                                            color: field.value ? selectedLevel?.foregroundColor : undefined,
                                                        }}
                                                        className={cn("h-8 text-xs font-bold", !field.value && 'text-muted-foreground')}
                                                    >
                                                        <SelectValue placeholder="Select level..." />
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
        <div className="h-full flex flex-col overflow-hidden">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-10">
                            {audit.template.sections.map((section) => (
                                <div key={section.id}>
                                    <h2 className="mb-6 border-b border-primary/20 py-2 pb-2 text-sm font-black uppercase tracking-widest text-primary">
                                        {section.title}
                                    </h2>
                                    <div className="space-y-4">
                                        {section.items.map(item => renderChecklistItem(item))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    
                    {!isReadOnly && (
                        <div className="shrink-0 flex items-center justify-between p-4 border-t bg-muted/10 no-print">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Draft progress is periodically auto-saved to local cache.</span>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" variant="outline" size="sm" className="h-9 px-6 gap-2">
                                    <Save className="h-4 w-4" /> Save Progress
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="default" size="sm" className="h-9 px-6 shadow-md">Finalize Audit</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Finalize Record?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will lock all checklist responses, calculate the final compliance score, and generate corrective action plans for any non-compliant items.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleFinalizeAudit}>Finalize Audit</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    )}
                </form>
            </Form>

            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="shrink-0 border-b pb-4"><DialogTitle>Evidence Detail</DialogTitle></DialogHeader>
                    {viewingImageUrl && (
                        <div className="flex-1 relative min-h-[60vh] mt-4">
                            <Image src={viewingImageUrl} alt="Evidence" fill className="object-contain"/>
                        </div>
                    )}
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
        </div>
    );
}
