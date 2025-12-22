

'use client';

import { useState, useMemo, useCallback, ChangeEvent } from 'react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, ChevronDown, Upload, Loader2, ClipboardPaste, WandSparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { seedComplianceData } from '@/lib/seed-data/part-141';

import type { ComplianceRequirement, QualityAudit } from '@/types/quality';
import type { Personnel } from '../../users/personnel/page';
import { ComplianceItemForm } from './item-form';
import { summarizeDocument, SummarizeDocumentInput } from '@/ai/flows/summarize-document-flow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';


function UploadRegulationsDialog({ tenantId }: { tenantId: string }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [file, setFile] = useState<File | null>(null);
    const [pastedText, setPastedText] = useState('');
    const [stagedImages, setStagedImages] = useState<string[]>([]);
    const [isMultiImageMode, setIsMultiImageMode] = useState(false);
    
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
                        const newImage = e.target?.result as string;
                        setStagedImages(prev => [...prev, newImage]);
                        toast({ title: 'Image Added', description: 'The image has been staged for processing.' });
                    };
                    reader.readAsDataURL(blob);
                }
                return;
            }
            if (items[i].type.startsWith('text/plain')) {
                event.preventDefault();
                items[i].getAsString((text) => {
                    setPastedText(text);
                     toast({ title: 'Text Pasted', description: 'The text has been loaded and is ready to be processed.' });
                });
                return; 
            }
        }
    }, [toast]);

    const removeStagedImage = (index: number) => {
        setStagedImages(prev => prev.filter((_, i) => i !== index));
    };

    const processAndSave = async (input: SummarizeDocumentInput) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Database not available' });
            return;
        }

        setIsProcessing(true);
        try {
            const { requirements } = await summarizeDocument(input);

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
            setStagedImages([]);
            setIsMultiImageMode(false);
            setIsOpen(false);
        }
    };

    const handleProcess = async () => {
        let input: SummarizeDocumentInput = { document: {} };
        
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                input.document.text = e.target?.result as string;
                await processAndSave(input);
            };
            reader.readAsText(file);
        } else if (pastedText) {
            input.document.text = pastedText;
            await processAndSave(input);
        } else if (stagedImages.length > 0) {
            input.document.images = stagedImages;
            input.isMultiPage = isMultiImageMode;
            await processAndSave(input);
        }
    };

    const canProcess = file || pastedText.trim() || stagedImages.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><WandSparkles className="mr-2 h-4 w-4" /> AI Populate</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Populate Matrix with AI</DialogTitle>
                    <DialogDescription>
                        Upload a file, paste text, or paste one or more images of regulations. The AI will parse them and add the requirements to the matrix.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="image">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="image">Paste Images</TabsTrigger>
                        <TabsTrigger value="text">Paste Text</TabsTrigger>
                        <TabsTrigger value="file">Upload File</TabsTrigger>
                    </TabsList>
                    <TabsContent value="image" className="pt-4">
                         <div
                            onPaste={handlePaste}
                            className="h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground mb-4"
                        >
                            <div className="text-center">
                                <ClipboardPaste className="mx-auto h-8 w-8" />
                                <p>Click here and paste image(s) (Ctrl+V)</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 my-4">
                            <Switch id="multi-image-mode" checked={isMultiImageMode} onCheckedChange={setIsMultiImageMode} />
                            <Label htmlFor="multi-image-mode">Treat images as a single document</Label>
                        </div>
                        {isMultiImageMode && (
                           <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
                               Instruction to AI: &quot;You will be given a sequence of images. Treat them as pages of a single document, in the order they are provided. Text may flow from one image to the next.&quot;
                           </p>
                        )}
                        <ScrollArea className="h-48 mt-4">
                           <div className="grid grid-cols-3 gap-4">
                                {stagedImages.map((imageSrc, index) => (
                                    <div key={index} className="relative group">
                                        <Image src={imageSrc} alt={`Staged image ${index + 1}`} width={150} height={150} className="rounded-md object-cover aspect-square" />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => removeStagedImage(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="text" className="pt-4">
                        <ScrollArea className="h-96 rounded-md border">
                            <Textarea
                                placeholder="Paste the raw text of the regulations here..."
                                className="h-full min-h-[24rem] border-none focus-visible:ring-0"
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                onPaste={handlePaste}
                            />
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="file" className="pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="reg-file">Regulation File (.txt)</Label>
                            <Input id="reg-file" type="file" onChange={handleFileChange} accept=".txt" />
                             {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
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

  const naturalSort = (a: string, b: string) => {
    const re = /(\d+)/g;
    const aParts = a.split(re);
    const bParts = b.split(re);
    const len = Math.min(aParts.length, bParts.length);

    for (let i = 0; i < len; i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];

        if (i % 2 === 1) { // It's a number
            const aNum = parseInt(aPart, 10);
            const bNum = parseInt(bPart, 10);
            if (aNum !== bNum) {
                return aNum - bNum;
            }
        } else { // It's a string
            if (aPart !== bPart) {
                return aPart.localeCompare(bPart);
            }
        }
    }
    return a.length - b.length;
  };
  
  const sortedComplianceItems = useMemo(() => {
    if (!complianceItems) return [];
    return [...complianceItems].sort((a, b) => naturalSort(a.regulationCode, b.regulationCode));
  }, [complianceItems]);

  const groupedComplianceItems = useMemo(() => {
    if (!sortedComplianceItems) return {};
    return sortedComplianceItems.reduce((acc, item) => {
      const parentCode = item.parentRegulationCode || 'Uncategorized';
      if (!acc[parentCode]) {
        acc[parentCode] = { parent: sortedComplianceItems.find(p => p.regulationCode === parentCode), children: [] };
      }
      if (item.parentRegulationCode) {
        acc[parentCode].children.push(item);
      }
      return acc;
    }, {} as Record<string, { parent: ComplianceRequirement | undefined, children: ComplianceRequirement[] }>);
  }, [sortedComplianceItems]);

  const topLevelItems = useMemo(() => {
    return (sortedComplianceItems || []).filter(item => !item.parentRegulationCode);
  }, [sortedComplianceItems]);


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
                <div className="space-y-4">
                    {topLevelItems.map(parentItem => (
                      <Collapsible key={parentItem.id} className="border rounded-lg" defaultOpen={false}>
                        <div className="flex items-center p-4 hover:bg-muted/50 rounded-t-lg">
                            <CollapsibleTrigger className="flex w-full items-center text-left">
                               <span className="font-mono text-sm font-semibold w-28 flex-shrink-0">{parentItem.regulationCode}</span>
                               <p className="font-medium flex-1 mx-4">{parentItem.regulationStatement}</p>
                               <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]:-rotate-180" />
                            </CollapsibleTrigger>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(parentItem.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <CollapsibleContent className="p-4 border-t">
                          {(groupedComplianceItems[parentItem.regulationCode]?.children || []).map(item => {
                              const { lastAudit, findings } = getAuditDataForRegulation(item.regulationCode);
                              const responsibleManager = personnel?.find(p => p.id === item.responsibleManagerId);
                              return (
                                  <Collapsible key={item.id} className="border rounded-lg mb-2">
                                    <div className="flex justify-between items-center p-4">
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
                                      <CollapsibleContent className="space-y-4 px-4 pb-4 border-t">
                                          <div><p className="font-semibold text-sm">Full Regulation Text</p><p className="text-muted-foreground whitespace-pre-wrap">{item.technicalStandard}</p></div>
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
                          {(!groupedComplianceItems[parentItem.regulationCode]?.children || groupedComplianceItems[parentItem.regulationCode]?.children.length === 0) && (
                              <p className="text-sm text-muted-foreground text-center py-4">No sub-regulations found for this section.</p>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
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
