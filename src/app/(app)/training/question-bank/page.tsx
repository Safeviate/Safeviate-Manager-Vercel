'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
<<<<<<< HEAD
import { Card, CardContent, CardHeader } from '@/components/ui/card';
=======
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
>>>>>>> temp-save-work
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Trash2, Library, Pencil, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import type { QuestionBankItem } from '@/types/training';
import type { ExamTopicsSettings } from '../../admin/exam-topics/page';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AiExamGenerator } from '../exams/ai-exam-generator';
<<<<<<< HEAD
import { MainPageHeader } from '@/components/page-header';
=======
>>>>>>> temp-save-work

export default function QuestionBankPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId } = useUserProfile();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [editingItem, setEditingItem] = useState<QuestionBankItem | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const topicsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'exam-topics') : null),
    [firestore, tenantId]
  );
  const { data: topicsData, isLoading: isLoadingTopics } = useDoc<ExamTopicsSettings>(topicsRef);

  useEffect(() => {
    if (topicsData?.topics?.length && !selectedTopic) {
        setSelectedTopic(topicsData.topics[0]);
    }
  }, [topicsData, selectedTopic]);

  const poolQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, 'tenants', tenantId, 'question-pool'), orderBy('createdAt', 'desc')) : null),
    [firestore, tenantId]
  );
  const { data: poolItems, isLoading } = useCollection<QuestionBankItem>(poolQuery);

  const filteredItems = useMemo(() => {
    if (!poolItems) return [];
    return poolItems.filter(item => {
      const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTopic = item.topic === selectedTopic;
      return matchesSearch && matchesTopic;
    });
  }, [poolItems, searchQuery, selectedTopic]);

  const handleAiGenerated = async (questions: any[]) => {
    if (!firestore || !tenantId) return;
    
    const targetTopic = selectedTopic;
    const batch = writeBatch(firestore);
    const poolCol = collection(firestore, 'tenants', tenantId, 'question-pool');

    questions.forEach(q => {
        const docRef = doc(poolCol);
        batch.set(docRef, {
            ...q,
            topic: targetTopic,
            createdAt: new Date().toISOString()
        });
    });

    await batch.commit();
    toast({ 
        title: 'Bank Populated', 
        description: `${questions.length} questions added to the ${targetTopic} database.` 
    });
  };

  if (isLoadingTopics || (isLoading && !poolItems)) {
    return (
<<<<<<< HEAD
      <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[500px] w-full" />
=======
      <div className="p-8 space-y-6">
        <Skeleton className="h-14 w-full px-1" />
        <Skeleton className="h-[400px] w-full px-1" />
>>>>>>> temp-save-work
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pt-2 px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
        <div className="sticky top-0 z-30 bg-card">
            <MainPageHeader 
                title="Question Bank Manager"
                description="Central database of aviation questions organized by topic."
                actions={
                    <>
                        <AiExamGenerator onGenerated={handleAiGenerated} />
                        <Button size="sm" className="w-full sm:w-auto h-9 px-6 text-xs font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2" onClick={() => setIsAddOpen(true)} disabled={!selectedTopic}>
                            <PlusCircle className="h-4 w-4" /> Add Question
                        </Button>
                    </>
                }
            />
            <div className="border-b bg-muted/5 p-4 sm:p-6 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_120px] gap-6 lg:gap-8 items-start">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Active Database</Label>
                    <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                        <SelectTrigger className="h-11 bg-background border-slate-300 font-bold shadow-sm">
                            <Database className="h-4 w-4 mr-2 text-primary" />
                            <SelectValue placeholder="Select Topic Bank..." />
                        </SelectTrigger>
                        <SelectContent>
                            {(topicsData?.topics || []).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Search {selectedTopic || 'Database'}</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Keywords..." 
                            className="pl-9 bg-background h-11 border-slate-300 shadow-sm font-medium text-sm" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2 hidden lg:block">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Database Size</Label>
                    <div className="h-11 flex items-center justify-center">
                        <Badge variant="outline" className="font-black text-sm h-8 px-4 rounded-full border-primary/30 bg-background shadow-sm">
                            {filteredItems.length}
                        </Badge>
                    </div>
                </div>
              </div>
            </div>
=======
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Question Bank Manager"
          actions={
            <div className="flex gap-2 w-full sm:w-auto">
                <AiExamGenerator onGenerated={handleAiGenerated} />
                <Button size="sm" className="h-9 px-6 text-[10px] font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2" onClick={() => setIsAddOpen(true)} disabled={!selectedTopic}>
                    <PlusCircle className="h-4 w-4" /> Add Question
                </Button>
            </div>
          }
        />

        <div className="shrink-0 border-b bg-muted/5 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px] gap-6 items-start">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Active Database</Label>
                <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                    <SelectTrigger className="h-11 bg-background border-primary/30 font-bold">
                        <Database className="h-4 w-4 mr-2 text-primary" />
                        <SelectValue placeholder="Select Topic Bank..." />
                    </SelectTrigger>
                    <SelectContent>
                        {(topicsData?.topics || []).map(t => <SelectItem key={t} value={t} className="font-medium">{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Search {selectedTopic || 'Database'}</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Keywords..." 
                        className="pl-9 bg-background h-11 text-xs font-medium" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Items</Label>
                <div className="h-11 flex items-center justify-center">
                    <Badge variant="outline" className="font-black text-sm h-9 px-5 rounded-full border-primary/30 bg-background shadow-sm">
                        {filteredItems.length}
                    </Badge>
                </div>
            </div>
          </div>
>>>>>>> temp-save-work
        </div>
        
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full custom-scrollbar pr-4">
            <div className="p-0 pb-20">
                {/* --- DESKTOP TABLE VIEW --- */}
                <div className="hidden lg:block">
                    <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                            <TableRow>
<<<<<<< HEAD
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider px-6 py-3">Question Text</TableHead>
                            <TableHead className="w-24 text-center text-[10px] uppercase font-bold tracking-wider">Options</TableHead>
                            <TableHead className="w-32 text-right text-[10px] uppercase font-bold tracking-wider px-6">Actions</TableHead>
=======
                            <TableHead className="text-[10px] uppercase font-bold px-6 py-3 tracking-wider">Question Text</TableHead>
                            <TableHead className="w-24 text-center text-[10px] uppercase font-bold tracking-wider">Options</TableHead>
                            <TableHead className="w-24 text-right text-[10px] uppercase font-bold px-6 tracking-wider">Actions</TableHead>
>>>>>>> temp-save-work
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => (
<<<<<<< HEAD
                            <TableRow key={item.id} className="hover:bg-muted/10 transition-colors group">
                                <TableCell className="font-medium text-sm py-4 px-6">
                                    <p className="leading-relaxed font-bold">{item.text}</p>
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs opacity-50 font-bold">
                                    {item.options.length}
=======
                            <TableRow key={item.id} className="hover:bg-muted/5 transition-colors">
                                <TableCell className="font-bold text-sm text-foreground py-4 px-6">
                                    <p className="line-clamp-2 leading-relaxed">&quot;{item.text}&quot;</p>
                                </TableCell>
                                <TableCell className="text-center font-black text-[10px] text-muted-foreground opacity-50 uppercase tracking-tighter">
                                    {item.options.length} OPTS
>>>>>>> temp-save-work
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" className="h-8 w-8 text-primary border-slate-300" onClick={() => setEditingItem(item)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DeleteQuestionButton item={item} tenantId={tenantId!} selectedTopic={selectedTopic} />
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* --- MOBILE CARD VIEW --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden p-4 sm:p-6">
                    {filteredItems.map((item) => (
<<<<<<< HEAD
                        <div key={item.id} className="rounded-xl border bg-muted/5 overflow-hidden flex flex-col">
                            <div className="p-4 pb-2 border-b bg-background/50 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{selectedTopic}</span>
                                <Badge variant="outline" className="text-[9px] font-mono font-black border-slate-300">{item.options.length} OPTIONS</Badge>
                            </div>
                            <div className="p-4 py-3 flex-1 bg-background">
                                <p className="text-sm font-bold line-clamp-3 leading-relaxed">&quot;{item.text}&quot;</p>
                            </div>
                            <div className="p-3 border-t bg-muted/5 flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1 text-[10px] font-black uppercase h-9 border-slate-300" onClick={() => setEditingItem(item)}>
=======
                        <Card key={item.id} className="shadow-none border-slate-200 overflow-hidden">
                            <div className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{selectedTopic}</span>
                                <Badge variant="outline" className="text-[9px] font-black uppercase">{item.options.length} OPTIONS</Badge>
                            </div>
                            <CardContent className="p-4 py-3">
                                <p className="text-sm font-bold text-foreground line-clamp-3 leading-relaxed">&quot;{item.text}&quot;</p>
                            </CardContent>
                            <CardFooter className="p-2 border-t bg-muted/5 flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1 text-[10px] font-black uppercase h-8 border-slate-300" onClick={() => setEditingItem(item)}>
>>>>>>> temp-save-work
                                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                </Button>
                                <DeleteQuestionButton item={item} tenantId={tenantId!} selectedTopic={selectedTopic} />
                            </div>
                        </div>
                    ))}
                </div>

                {filteredItems.length === 0 && !isLoading && (
                    <div className="h-64 text-center text-muted-foreground italic flex flex-col items-center justify-center gap-4 opacity-30 mt-10">
                        <Library className="h-16 w-16" />
                        <div className="space-y-1">
<<<<<<< HEAD
                            <p className="text-lg font-black uppercase tracking-tight">Empty Topic Database</p>
=======
                            <p className="text-lg font-black uppercase tracking-tighter">Empty Topic Database</p>
>>>>>>> temp-save-work
                            <p className="text-sm font-medium">No questions found in {selectedTopic || 'this topic'}.</p>
                        </div>
                    </div>
                )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <UpsertQuestionDialog 
        isOpen={isAddOpen || !!editingItem} 
        onOpenChange={(open) => {
            if (!open) {
                setIsAddOpen(false);
                setEditingItem(null);
            }
        }} 
        tenantId={tenantId!} 
        topic={selectedTopic}
        editingItem={editingItem}
      />
    </div>
  );
}

function DeleteQuestionButton({ item, tenantId, selectedTopic }: { item: QuestionBankItem, tenantId: string, selectedTopic: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!firestore || !tenantId) return;
        setIsDeleting(true);
        try {
            const docRef = doc(firestore, 'tenants', tenantId, 'question-pool', item.id);
            await deleteDocumentNonBlocking(docRef);
            toast({ title: 'Question Deleted', description: `Removed from ${selectedTopic} bank.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black uppercase tracking-tight">Delete Question?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium">
                        This will permanently remove this question from the <strong className="text-foreground">{selectedTopic}</strong> database. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-[10px] font-black uppercase">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete}
                        disabled={isDeleting}
<<<<<<< HEAD
                        className="bg-destructive hover:bg-destructive/90 font-black uppercase text-xs"
=======
                        className="bg-destructive hover:bg-destructive/90 text-[10px] font-black uppercase"
>>>>>>> temp-save-work
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Permanently'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

interface UpsertQuestionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    tenantId: string;
    topic: string;
    editingItem?: QuestionBankItem | null;
}

function UpsertQuestionDialog({ isOpen, onOpenChange, tenantId, topic, editingItem }: UpsertQuestionDialogProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [text, setText] = useState('');
    const [options, setOptions] = useState<{ id: string; text: string }[]>([]);
    const [correctId, setCorrectId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setText(editingItem.text);
                setOptions(editingItem.options);
                setCorrectId(editingItem.correctOptionId);
            } else {
                setText('');
                setOptions([
                    { id: uuidv4(), text: '' },
                    { id: uuidv4(), text: '' }
                ]);
                setCorrectId('');
            }
        }
    }, [isOpen, editingItem]);

    const handleSave = async () => {
        if (!text.trim()) {
            toast({ variant: 'destructive', title: 'Invalid Form', description: 'Please enter the question text.' });
            return;
        }
        if (options.some(o => !o.text.trim())) {
            toast({ variant: 'destructive', title: 'Invalid Form', description: 'Ensure all options have text filled in.' });
            return;
        }
        if (!correctId) {
            toast({ variant: 'destructive', title: 'Invalid Form', description: 'Please select which option is the correct answer using the radio buttons.' });
            return;
        }

        if (!firestore || !tenantId) return;
        setIsSaving(true);

        try {
            const data = {
                topic,
                text,
                options,
                correctOptionId: correctId,
                createdAt: editingItem?.createdAt || new Date().toISOString()
            };

            if (editingItem) {
                const docRef = doc(firestore, 'tenants', tenantId, 'question-pool', editingItem.id);
                updateDocumentNonBlocking(docRef, data);
                toast({ title: 'Question Updated' });
            } else {
                const poolCol = collection(firestore, 'tenants', tenantId, 'question-pool');
                addDocumentNonBlocking(poolCol, data);
                toast({ title: 'Question Added' });
            }
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
<<<<<<< HEAD
                    <DialogTitle className="font-black uppercase tracking-tight">{editingItem ? 'Edit Question' : 'Add Question'}</DialogTitle>
                    <DialogDescription>
=======
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingItem ? 'Edit Question' : 'Add Question'}</DialogTitle>
                    <DialogDescription className="text-sm font-medium">
>>>>>>> temp-save-work
                        Adding to the <span className="font-bold text-primary">{topic}</span> database.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Question Text</Label>
                            <Textarea 
                                value={text} 
                                onChange={(e) => setText(e.target.value)} 
                                placeholder="Enter the technical question..." 
<<<<<<< HEAD
                                className="min-h-[120px] bg-muted/5 font-medium border-slate-300" 
=======
                                className="min-h-[120px] bg-muted/5 font-medium text-sm leading-relaxed" 
>>>>>>> temp-save-work
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Options (Select One Correct Answer)</Label>
<<<<<<< HEAD
                                {!correctId && <Badge variant="destructive" className="h-5 text-[8px] animate-pulse font-black uppercase">SELECTION REQUIRED</Badge>}
=======
                                {!correctId && <Badge variant="destructive" className="h-5 text-[8px] font-black uppercase animate-pulse">SELECTION REQUIRED</Badge>}
>>>>>>> temp-save-work
                            </div>
                            
                            <div className="space-y-3">
                                {options.map((opt, idx) => (
                                    <div key={opt.id} className={cn(
                                        "flex gap-3 items-center p-3 rounded-xl border transition-all",
                                        correctId === opt.id ? "bg-green-50 border-green-500 ring-1 ring-green-500" : "bg-muted/5 border-border"
                                    )}>
                                        <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                            <input 
                                                type="radio" 
                                                name="correct" 
                                                id={`radio-${opt.id}`}
                                                checked={correctId === opt.id} 
                                                onChange={() => setCorrectId(opt.id)} 
                                                className="accent-green-600 h-5 w-5 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`radio-${opt.id}`} className="text-[9px] uppercase font-black tracking-widest text-muted-foreground cursor-pointer">
                                                    Option {idx + 1}
                                                </Label>
                                                {correctId === opt.id && (
<<<<<<< HEAD
                                                    <Badge className="h-5 text-[9px] font-black uppercase tracking-tight bg-green-600 text-white border-none gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> CORRECT ANSWER
=======
                                                    <Badge className="h-4 text-[8px] font-black uppercase bg-green-600 text-white border-none gap-1">
                                                        <CheckCircle2 className="h-2 w-2" /> CORRECT ANSWER
>>>>>>> temp-save-work
                                                    </Badge>
                                                )}
                                            </div>
                                            <Input 
                                                value={opt.text} 
                                                onChange={(e) => {
                                                    const next = [...options];
                                                    next[idx].text = e.target.value;
                                                    setOptions(next);
                                                }}
                                                placeholder={`Option ${idx + 1} text...`}
<<<<<<< HEAD
                                                className="border-none bg-transparent shadow-none focus-visible:ring-0 h-8 p-0 text-sm font-bold"
=======
                                                className="border-none bg-transparent shadow-none focus-visible:ring-0 h-8 p-0 text-sm font-bold text-foreground"
>>>>>>> temp-save-work
                                            />
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => {
                                                if (correctId === opt.id) setCorrectId('');
                                                setOptions(options.filter(o => o.id !== opt.id));
                                            }} 
                                            disabled={options.length <= 2}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setOptions([...options, { id: uuidv4(), text: '' }])} 
<<<<<<< HEAD
                                className="w-full h-10 border-dashed border-2 hover:bg-muted/10 text-xs font-black uppercase tracking-tight"
=======
                                className="w-full h-10 border-dashed border-2 hover:bg-muted/10 text-[10px] font-black uppercase border-slate-300"
>>>>>>> temp-save-work
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Option
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4 bg-muted/5 -mx-6 px-6 sm:rounded-b-lg">
                    <div className="flex items-center gap-2 mr-auto text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">At least two options and one correct answer required.</span>
                    </div>
<<<<<<< HEAD
                    <DialogClose asChild><Button variant="outline" disabled={isSaving} className="text-xs font-black uppercase">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-700 hover:bg-emerald-800 font-black uppercase text-xs">
=======
                    <DialogClose asChild><Button variant="outline" disabled={isSaving} className="text-[10px] font-black uppercase border-slate-300">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving} className="text-[10px] font-black uppercase">
>>>>>>> temp-save-work
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingItem ? 'Update Question' : 'Save to Database')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
