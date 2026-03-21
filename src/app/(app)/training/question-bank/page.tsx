'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Question Bank Manager</h1>
          <p className="text-muted-foreground">central database of aviation questions by topic.</p>
        </div>
        <div className="flex gap-2">
            <AiExamGenerator onGenerated={handleAiGenerated} />
            <Button onClick={() => setIsAddOpen(true)} disabled={!selectedTopic}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
            </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="space-y-1">
                <Label className="text-[10px] uppercase font-black text-primary tracking-widest">Active Database</Label>
                <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                    <SelectTrigger className="w-[300px] h-10 bg-background border-primary/30 font-bold">
                        <Database className="h-3.5 w-3.5 mr-2 text-primary" />
                        <SelectValue placeholder="Select Topic Bank..." />
                    </SelectTrigger>
                    <SelectContent>
                        {(topicsData?.topics || []).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1 flex-1 max-w-sm">
                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Search {selectedTopic}</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Keywords..." 
                        className="pl-9 bg-background h-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Database Size</p>
            <Badge variant="outline" className="font-mono text-sm py-0 px-3 border-primary/30">
                {filteredItems.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold">Question Text</TableHead>
                  <TableHead className="w-24 text-center text-[10px] uppercase font-bold">Options</TableHead>
                  <TableHead className="w-24 text-right text-[10px] uppercase font-bold px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-medium text-sm py-4">
                        <p className="line-clamp-2">{item.text}</p>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs opacity-50">
                        {item.options.length}
                    </TableCell>
                    <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/5" onClick={() => setEditingItem(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            
                            <DeleteQuestionButton item={item} tenantId={tenantId!} selectedTopic={selectedTopic} />
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && !isLoading && (
                    <TableRow>
                        <TableCell colSpan={3} className="h-64 text-center text-muted-foreground italic">
                            <div className="flex flex-col items-center justify-center gap-4 opacity-20">
                                <Library className="h-16 w-16" />
                                <div className="space-y-1">
                                    <p className="text-lg font-bold uppercase tracking-tighter">Empty Topic Database</p>
                                    <p className="text-sm">No questions found in {selectedTopic || 'this topic'}.</p>
                                </div>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
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
                <Button variant="destructive" size="icon" className="h-8 w-8 shadow-sm">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently remove this question from the <strong>{selectedTopic}</strong> database. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
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
                    <DialogTitle>{editingItem ? 'Edit Question' : 'Add Question'}</DialogTitle>
                    <DialogDescription>
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
                                className="min-h-[120px] bg-muted/5 font-medium" 
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Options (Select One Correct Answer)</Label>
                                {!correctId && <Badge variant="destructive" className="h-5 text-[8px] animate-pulse">SELECTION REQUIRED</Badge>}
                            </div>
                            
                            <div className="space-y-3">
                                {options.map((opt, idx) => (
                                    <div key={opt.id} className={cn(
                                        "flex gap-3 items-center p-2 rounded-lg border transition-all",
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
                                                <Label htmlFor={`radio-${opt.id}`} className="text-[9px] uppercase font-bold text-muted-foreground cursor-pointer">
                                                    Option {idx + 1}
                                                </Label>
                                                {correctId === opt.id && (
                                                    <Badge className="h-4 text-[8px] bg-green-600 text-white border-none gap-1">
                                                        <CheckCircle2 className="h-2 w-2" /> CORRECT ANSWER
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
                                                className="border-none bg-transparent shadow-none focus-visible:ring-0 h-8 p-0 text-sm font-medium"
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
                                            className="text-muted-foreground hover:text-destructive h-8 w-8"
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
                                className="w-full h-10 border-dashed border-2 hover:bg-muted/10 text-xs font-bold"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Option
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4 bg-muted/5 -mx-6 px-6">
                    <div className="flex items-center gap-2 mr-auto text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[10px] font-medium italic">All technical questions require at least two options and one correct answer.</span>
                    </div>
                    <DialogClose asChild><Button variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingItem ? 'Update Question' : 'Save to Database')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
