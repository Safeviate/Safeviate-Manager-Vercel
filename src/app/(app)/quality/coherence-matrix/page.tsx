
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, ChevronDown, Upload, Loader2, ClipboardPaste } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { seedComplianceData } from '@/lib/seed-data/part-141';

import type { ComplianceRequirement, QualityAudit } from '@/types/quality';
import type { Personnel } from '../../users/personnel/page';
import { ComplianceItemForm } from './item-form';
import { summarizeDocument } from '@/ai/flows/summarize-document-flow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';


function UploadRegulationsDialog({ tenantId }: { tenantId: string }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // State for different input types
    const [file, setFile] = useState<File | null>(null);
    const [pastedText, setPastedText] = useState('');
    const [pastedImage, setPastedImage] = useState<string | null>(null);
    
    const firestore = useFirestore();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };
    
    const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        setPastedImage(e.target?.result as string);
                        toast({ title: 'Image Pasted', description: 'The image has been loaded and is ready to be processed.' });
                    };
                    reader.readAsDataURL(blob);
                }
                return; // Stop after handling the first image
            }
        }
    }, [toast]);

    const processAndSave = async (input: { text?: string; image?: string }) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Database not available' });
            return;
        }

        setIsProcessing(true);
        try {
            const { requirements } = await summarizeDocument({ document: input });

            if (!requirements || requirements.length === 0) {
                toast({ variant: 'destructive', title: 'No Regulations Found', description: 'The AI could not identify any regulations in the provided content.' });
                return;
            }

            const batch = writeBatch(firestore);
            const collectionRef = collection(firestore, `tenants/${tenantId}/compliance-matrix`);
            
            requirements.forEach(req => {
                const docRef = doc(collectionRef);
                batch.set(docRef, req);
            });

            await batch.commit();

            toast({
                title: 'Matrix Populated',
                description: `${requirements.length} compliance requirements have been added to the matrix.`,
            });

        } catch (error: any) {
            console.error('Error processing document:', error);
            toast({ variant: 'destructive', title: 'Processing Failed', description: error.message || 'An unknown error occurred.' });
        } finally {
            setIsProcessing(false);
            setFile(null);
            setPastedText('');
            setPastedImage(null);
            setIsOpen(false);
        }
    };

    const handleProcess = async () => {
        if (file) {
            const documentContent = await file.text();
            await processAndSave({ text: documentContent });
        } else if (pastedText) {
            await processAndSave({ text: pastedText });
        } else if (pastedImage) {
            await processAndSave({ image: pastedImage });
        }
    };

    const canProcess = file || pastedText.trim() || pastedImage;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Upload Regulations</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Populate Matrix from Document</DialogTitle>
                    <DialogDescription>
                        Upload a file, paste text, or paste an image of regulations. The AI will parse it and add the requirements to the matrix.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="text">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="text">Paste Text</TabsTrigger>
                        <TabsTrigger value="file">Upload File</TabsTrigger>
                        <TabsTrigger value="image">Paste Image</TabsTrigger>
                    </TabsList>
                    <TabsContent value="text" className="pt-4">
                        <Textarea
                            placeholder="Paste the raw text of the regulations here..."
                            className="h-48"
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                        />
                    </TabsContent>
                    <TabsContent value="file" className="pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="reg-file">Regulation File (.txt, .pdf, etc.)</Label>
                            <Input id="reg-file" type="file" onChange={handleFileChange} />
                             {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
                        </div>
                    </TabsContent>
                     <TabsContent value="image" className="pt-4">
                        <div 
                            onPaste={handlePaste} 
                            className="h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground"
                        >
                            {pastedImage ? (
                                <img src={pastedImage} alt="Pasted regulations" className="max-h-full max-w-full" />
                            ) : (
                                <div className="text-center">
                                    <ClipboardPaste className="mx-auto h-8 w-8" />
                                    <p>Click here and paste an image (Ctrl+V)</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
                    <Button onClick={handleProcess} disabled={isProcessing || !canProcess}>
                        {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Upload and Process'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function CoherenceMatrixPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceRequirement | null>(null);

  const complianceQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/compliance-matrix`)) : null), [firestore, tenantId]);
  const auditsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);

  const { data: complianceItems, isLoading: isLoadingItems } = useCollection<ComplianceRequirement>(complianceQuery);
  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

  const isLoading = isLoadingItems || isLoadingAudits || isLoadingPersonnel;

  const getAuditDataForRegulation = (regulationCode: string) => {
    if (!audits) return { lastAudit: null, findings: [] };

    const relevantAudits = audits
        .filter(audit => 
            audit.findings.some(finding => 
                finding.checklistItemId && // Placeholder, needs real logic to get regulation from checklist item
                true // This needs to be replaced with a lookup from checklist template
            )
        )
        .sort((a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime());

    if (relevantAudits.length === 0) return { lastAudit: null, findings: [] };
    
    const lastAudit = relevantAudits[0];
    const findings = lastAudit.findings.filter(f => f.finding !== 'Compliant'); // simplified

    return {
        lastAudit: format(new Date(lastAudit.auditDate), 'PPP'),
        findings: findings.map(f => f.comment).filter(Boolean) as string[],
    };
  };

  const handleSeedData = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const collectionRef = collection(firestore, `tenants/${tenantId}/compliance-matrix`);
    seedComplianceData.forEach(item => {
        const docRef = doc(collectionRef);
        batch.set(docRef, item);
    });
    await batch.commit();
    toast({ title: "Success", description: "Part 141 regulations have been seeded." });
  };
  
  const handleOpenForm = (item: ComplianceRequirement | null = null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, `tenants/${tenantId}/compliance-matrix`, itemId));
    toast({ title: "Success", description: "Compliance item has been deleted." });
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Regulatory Coherence Matrix</CardTitle>
              <CardDescription>
                Mapping external regulations to internal company processes.
              </CardDescription>
            </div>
            <div className="flex gap-2">
                <UploadRegulationsDialog tenantId={tenantId} />
                <Button variant="outline" onClick={handleSeedData}>Seed Part 141</Button>
                <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (
                <div className="space-y-2">
                    {(complianceItems || []).map(item => {
                        const { lastAudit, findings } = getAuditDataForRegulation(item.regulationCode);
                        const responsibleManager = personnel?.find(p => p.id === item.responsibleManagerId);
                        return (
                            <Collapsible key={item.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <CollapsibleTrigger className="flex w-full items-center text-left">
                                            <span className="font-mono text-sm font-semibold w-24 flex-shrink-0">{item.regulationCode}</span>
                                            <p className="font-medium truncate flex-1 mx-4">{item.regulationStatement}</p>
                                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]:-rotate-180" />
                                        </CollapsibleTrigger>
                                    </div>
                                    <div className="flex items-center gap-2 pl-4">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(item)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <CollapsibleContent className="space-y-4 pt-4 mt-4 border-t">
                                    <div><p className="font-semibold text-sm">Regulation Statement</p><p className="text-muted-foreground">{item.regulationStatement}</p></div>
                                    <div><p className="font-semibold text-sm">Company Reference</p><p className="text-muted-foreground">{item.companyReference}</p></div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><p className="font-semibold text-sm">Responsible Manager</p><p className="text-muted-foreground">{responsibleManager ? `${responsibleManager.firstName} ${responsibleManager.lastName}` : 'N/A'}</p></div>
                                        <div><p className="font-semibold text-sm">Last Audit</p><p className="text-muted-foreground">{lastAudit || 'N/A'}</p></div>
                                        <div><p className="font-semibold text-sm">Next Audit</p><p className="text-muted-foreground">{item.nextAuditDate ? format(new Date(item.nextAuditDate), 'PPP') : 'N/A'}</p></div>
                                    </div>
                                    {findings.length > 0 && (
                                        <div><p className="font-semibold text-sm">Last Audit Findings</p>
                                            <ul className="list-disc list-inside text-destructive text-sm">
                                                {findings.map((f, i) => <li key={i}>{f}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        )
                    })}
                </div>
            )}
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} Compliance Requirement</DialogTitle>
            <DialogDescription>Fill in the details for the regulatory requirement.</DialogDescription>
          </DialogHeader>
          <ComplianceItemForm 
            personnel={personnel || []}
            existingItem={editingItem}
            onFormSubmit={() => setIsFormOpen(false)}
            tenantId={tenantId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
