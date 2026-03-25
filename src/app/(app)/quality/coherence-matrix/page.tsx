'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
<<<<<<< HEAD
=======
import { MainPageHeader } from "@/components/page-header";
>>>>>>> temp-save-work
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, ChevronDown, WandSparkles, Loader2, ClipboardPaste, BookOpen, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { seedComplianceData } from '@/lib/seed-data/part-141';
import { callAiFlow } from '@/lib/ai-client';

import type { ComplianceRequirement, ExternalOrganization, TabVisibilitySettings } from '@/types/quality';
import type { Personnel } from '../../users/personnel/page';
import { ComplianceItemForm } from './item-form';
import type { SummarizeDocumentInput, SummarizeDocumentOutput } from '@/ai/flows/summarize-document-flow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { MainPageHeader } from '@/components/page-header';


function UploadRegulationsDialog({ tenantId, organizationId }: { tenantId: string, organizationId: string | null }) {
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
            const { requirements } = await callAiFlow<
                SummarizeDocumentInput,
                SummarizeDocumentOutput
            >('summarizeDocument', input);

            if (!requirements || requirements.length === 0) {
                toast({ variant: 'destructive', title: 'No Regulations Found', description: 'The AI could not identify any regulations in the provided content.' });
                return;
            }

            const batch = writeBatch(firestore);
            const collectionRef = collection(firestore, `tenants/${tenantId}/compliance-matrix`);
            
            requirements.forEach(req => {
                const docRef = doc(collectionRef);
                batch.set(docRef, {
                    ...req,
                    organizationId: organizationId,
                });
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
<<<<<<< HEAD
                <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-black uppercase border-slate-300 gap-2">
=======
                <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase gap-2 border-slate-300">
>>>>>>> temp-save-work
                    <WandSparkles className="h-3.5 w-3.5 text-primary" /> 
                    AI Populate
                </Button>
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
                    <Button onClick={handleProcess} disabled={isProcessing || !canProcess} className="bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase text-xs">
                        {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Upload and Process'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CompanyTabsRow({ organizations }: { organizations: ExternalOrganization[] }) {
    return (
<<<<<<< HEAD
        <div className="border-b bg-muted/5 px-6 py-2 shrink-0">
            <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
                <TabsTrigger 
                    value="internal" 
                    className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                >
                    Internal
                </TabsTrigger>
                {organizations.map((organization) => (
                    <TabsTrigger
                        key={organization.id}
                        value={organization.id}
                        className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                    >
                        {organization.name}
=======
        <div className="border-b bg-muted/5 px-6 py-3 overflow-x-auto no-scrollbar">
            <div className="flex w-max gap-2 pr-6 flex-nowrap">
                <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                    <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase">
                        Internal
>>>>>>> temp-save-work
                    </TabsTrigger>
                    {organizations.map((organization) => (
                        <TabsTrigger
                            key={organization.id}
                            value={organization.id}
                            className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase"
                        >
                            {organization.name}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </div>
    );
}


export default function CoherenceMatrixPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-matrix-manage' });

  const canManageAll = hasPermission('quality-matrix-manage');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceRequirement | null>(null);

  const complianceQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/compliance-matrix`)) : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
  const orgsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null), [firestore, tenantId]);

  const { data: complianceItems, isLoading: isLoadingItems } = useCollection<ComplianceRequirement>(complianceQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);

  const isLoading = isLoadingItems || isLoadingPersonnel || isLoadingOrgs;

  const naturalSort = (a: string, b: string) => {
    const re = /(\d+)/g;
    const aParts = a.split(re);
    const bParts = b.split(re);
    const len = Math.min(aParts.length, bParts.length);

    for (let i = 0; i < len; i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];

        if (i % 2 === 1) {
            const aNum = parseInt(aPart, 10);
            const bNum = parseInt(bPart, 10);
            if (aNum !== bNum) return aNum - bNum;
        } else {
            if (aPart !== bPart) return aPart.localeCompare(bPart);
        }
    }
    return a.length - b.length;
  };

  const handleSeedData = async (orgId: string | null) => {
    if (!firestore || !tenantId) return;
    const batch = writeBatch(firestore);
    const collectionRef = collection(firestore, `tenants/${tenantId}/compliance-matrix`);
    seedComplianceData.forEach(item => {
        const docRef = doc(collectionRef);
        batch.set(docRef, { ...item, organizationId: orgId });
    });
    await batch.commit();
    toast({ title: "Success", description: "Part 141 regulations have been seeded." });
  };
  
  const handleOpenForm = (item: ComplianceRequirement | null = null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!firestore || !tenantId) return;
    await deleteDoc(doc(firestore, `tenants/${tenantId}/compliance-matrix`, itemId));
    toast({ title: "Success", description: "Compliance item has been deleted." });
  };
  
  const handleDeleteSection = async (parentItem: ComplianceRequirement) => {
      if (!firestore || !tenantId || !complianceItems) return;
      const batch = writeBatch(firestore);
      const parentRef = doc(firestore, `tenants/${tenantId}/compliance-matrix`, parentItem.id);
      batch.delete(parentRef);
      const childrenToDelete = complianceItems.filter(item => item.parentRegulationCode === parentItem.regulationCode);
      childrenToDelete.forEach(child => {
          const childRef = doc(firestore, `tenants/${tenantId}/compliance-matrix`, child.id);
          batch.delete(childRef);
      });
      await batch.commit();
      toast({ title: "Section Deleted" });
  }

  const renderOrgContext = (orgId: string | 'internal') => {
    const contextOrgId = orgId === 'internal' ? null : orgId;
    const filteredItems = (complianceItems || []).filter(item => 
        orgId === 'internal' ? !item.organizationId : item.organizationId === orgId
    );
    const sortedItems = [...filteredItems].sort((a, b) => naturalSort(a.regulationCode, b.regulationCode));
    const groupedItems = sortedItems.reduce((acc, item) => {
        const parentCode = item.parentRegulationCode;
        if (parentCode) {
            if (!acc[parentCode]) acc[parentCode] = [];
            acc[parentCode].push(item);
        }
        return acc;
    }, {} as Record<string, ComplianceRequirement[]>);
    const topLevelItems = sortedItems.filter(item => !item.parentRegulationCode);

    return (
<<<<<<< HEAD
        <div className="flex flex-col h-full overflow-hidden">
            <div className="sticky top-0 z-30 bg-card">
                <MainPageHeader 
                    title="Regulatory Coherence Matrix"
                    description="Map organizational procedures against specific regulatory requirements and standards."
                    actions={
                        <div className="flex items-center gap-3">
                            <UploadRegulationsDialog tenantId={tenantId!} organizationId={contextOrgId} />
                            <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-black uppercase border-slate-300 gap-2 shadow-sm" onClick={() => handleSeedData(contextOrgId)}>
                                <BookOpen className="h-3.5 w-3.5" /> Seed
                            </Button>
                            <Button size="sm" className="h-9 px-6 text-xs font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2" onClick={() => handleOpenForm()}>
                                <PlusCircle className="h-4 w-4" /> Add Item
                            </Button>
                        </div>
                    }
                />
                {shouldShowOrganizationTabs && <CompanyTabsRow organizations={organizations || []} />}
            </div>

            <div className="flex-1 p-0 overflow-hidden bg-background">
                <ScrollArea className="h-full no-scrollbar">
                    <div className="p-4 sm:p-6 space-y-6 pb-20">
                        {topLevelItems.map(parentItem => (
                            <div key={parentItem.id} className="border rounded-xl bg-muted/5 overflow-hidden relative">
                                <div className="p-4 border-b bg-muted/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="h-8 w-24 bg-emerald-800 text-white rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-tighter shrink-0">
                                            {parentItem.regulationCode}
=======
        <Card className="min-h-[500px] flex flex-col shadow-none border">
            <MainPageHeader 
                title="Coherence Matrix"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <UploadRegulationsDialog tenantId={tenantId!} organizationId={contextOrgId} />
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase gap-2 border-slate-300" onClick={() => handleSeedData(contextOrgId)}>
                            <BookOpen className="h-3.5 w-3.5" /> Seed Part 141
                        </Button>
                        <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm gap-2" onClick={() => handleOpenForm()}>
                            <PlusCircle className="h-4 w-4" /> Add Item
                        </Button>
                    </div>
                }
            />
            
            {shouldShowOrganizationTabs && <CompanyTabsRow organizations={organizations || []} />}
            
            <CardContent className="p-6">
                <div className="space-y-4">
                    {topLevelItems.map(parentItem => (
                        <Collapsible key={parentItem.id} className="border rounded-lg" defaultOpen>
                            <div className="flex items-center p-4 bg-muted/30 rounded-t-lg">
                                <CollapsibleTrigger className="flex flex-1 items-center text-left">
                                    <span className="font-mono text-sm font-semibold w-28 flex-shrink-0">{parentItem.regulationCode}</span>
                                    <p className="font-medium flex-1 mx-4">{parentItem.regulationStatement}</p>
                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                </CollapsibleTrigger>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSection(parentItem)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            <CollapsibleContent className="p-4">
                                {(groupedItems[parentItem.regulationCode] || []).map(item => (
                                    <Collapsible key={item.id} className="border rounded-lg mb-2 last:mb-0">
                                        <div className="flex justify-between items-center p-4">
                                            <CollapsibleTrigger className="flex w-full items-center text-left">
                                                <span className="font-mono text-sm font-semibold w-24 flex-shrink-0">{item.regulationCode}</span>
                                                <p className="font-medium truncate flex-1 mx-4">{item.regulationStatement}</p>
                                                <ChevronDown className="h-4 w-4" />
                                            </CollapsibleTrigger>
                                            <div className="flex items-center gap-2 pl-4">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(item)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
>>>>>>> temp-save-work
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDeleteSection(parentItem)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="font-bold text-sm text-foreground leading-snug whitespace-normal pr-8">
                                        {parentItem.regulationStatement}
                                    </p>
                                </div>
                                <div className="p-3 sm:p-4 space-y-3 bg-background overflow-hidden">
                                    {(groupedItems[parentItem.regulationCode] || []).map(item => (
                                        <Collapsible key={item.id} className="border rounded-lg overflow-hidden last:mb-0 transition-all hover:border-primary/30">
                                            <div className="p-3 sm:p-4 space-y-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="font-mono text-[10px] font-black text-muted-foreground w-20 flex-shrink-0 bg-muted/30 py-1 px-2 rounded border border-slate-200 text-center">
                                                        {item.regulationCode}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => handleOpenForm(item)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <CollapsibleTrigger className="flex w-full items-start text-left gap-3 group min-w-0">
                                                    <p className="font-medium text-sm whitespace-normal flex-1">
                                                        {item.regulationStatement}
                                                    </p>
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform shrink-0 mt-0.5" />
                                                </CollapsibleTrigger>
                                            </div>
                                            <CollapsibleContent className="space-y-4 px-4 sm:px-6 pb-6 pt-2 border-t bg-muted/5">
                                                <div className="space-y-2 overflow-hidden">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Technical Standard & Acceptable Means of Compliance</p>
                                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-wrap italic break-words">&quot;{item.technicalStandard}&quot;</p>
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ))}
                                    {(groupedItems[parentItem.regulationCode] || []).length === 0 && (
                                        <p className="text-center py-6 text-xs font-medium text-muted-foreground italic">No detailed requirements defined for this section.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {topLevelItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
                                <Layers className="h-16 w-16 mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">Coherence Matrix Empty</p>
                                <p className="text-xs font-medium max-w-xs mt-2">Populate your matrix using the AI upload tool or by seeding standard Part 141 regulations.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
  };

  if (isLoading) {
    return (
        <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full overflow-hidden pt-0 px-1">
        <div className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl bg-card">
            {!shouldShowOrganizationTabs ? (
                renderOrgContext(scopedOrganizationId)
            ) : (
                <Tabs defaultValue="internal" className="w-full flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <TabsContent value="internal" className="m-0 p-0 h-full">
                            {renderOrgContext('internal')}
                        </TabsContent>
                        {(organizations || []).map((org) => (
                            <TabsContent key={org.id} value={org.id} className="m-0 p-0 h-full">
                                {renderOrgContext(org.id)}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            )}
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="font-black uppercase tracking-tight">Compliance Requirement</DialogTitle>
            </DialogHeader>
            <ComplianceItemForm 
                personnel={personnel || []}
                existingItem={editingItem}
                onFormSubmit={() => setIsFormOpen(false)}
                tenantId={tenantId!}
            />
            </DialogContent>
        </Dialog>
    </div>
  );
}
