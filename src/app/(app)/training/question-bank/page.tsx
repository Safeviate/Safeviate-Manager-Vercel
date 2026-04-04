'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Trash2, Library, Pencil, Database, CheckCircle2, AlertCircle, Loader2, MoreHorizontal, WandSparkles, ChevronDown } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function QuestionBankPage() {
  const { toast } = useToast();
  const { tenantId } = useUserProfile();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [editingItem, setEditingItem] = useState<QuestionBankItem | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [topicsData, setTopicsData] = useState<ExamTopicsSettings | null>(null);
  const [poolItems, setPoolItems] = useState<QuestionBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);

  useEffect(() => {
    const load = () => {
        try {
            const storedTopics = localStorage.getItem('safeviate.exam-topics');
            if (storedTopics) setTopicsData(JSON.parse(storedTopics));
            
            const storedPool = localStorage.getItem('safeviate.question-pool');
            if (storedPool) setPoolItems(JSON.parse(storedPool).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (e) {
            console.error('Local storage load failed', e);
        } finally {
            setIsLoading(false);
            setIsLoadingTopics(false);
        }
    };
    load();

    const handleUpdate = () => {
        load();
    };
    window.addEventListener('safeviate-question-bank-updated', handleUpdate);
    return () => window.removeEventListener('safeviate-question-bank-updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (topicsData?.topics?.length && !selectedTopic) {
        setSelectedTopic(topicsData.topics[0]);
    }
  }, [topicsData, selectedTopic]);

  const filteredItems = useMemo(() => {
    if (!poolItems) return [];
    return poolItems.filter(item => {
      const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTopic = item.topic === selectedTopic;
      return matchesSearch && matchesTopic;
    });
  }, [poolItems, searchQuery, selectedTopic]);

  const handleAiGenerated = async (questions: any[]) => {
    const targetTopic = selectedTopic;
    try {
        const storedPool = localStorage.getItem('safeviate.question-pool');
        const currentPool = storedPool ? JSON.parse(storedPool) : [];
        const newItems = questions.map(q => ({
            ...q,
            id: crypto.randomUUID(),
            topic: targetTopic,
            createdAt: new Date().toISOString()
        }));
        const nextPool = [...newItems, ...currentPool];
        localStorage.setItem('safeviate.question-pool', JSON.stringify(nextPool));
        setPoolItems(nextPool);
        
        window.dispatchEvent(new Event('safeviate-question-bank-updated'));
        toast({ 
            title: 'Bank Populated', 
            description: `${questions.length} questions added to the ${targetTopic} database.` 
        });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Populate Failed' });
    }
  };

  if (isLoadingTopics || (isLoading && !poolItems)) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-14 w-full px-1" />
        <Skeleton className="h-[400px] w-full px-1" />
      </div>
    );
  }

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Question Bank Manager"
          actions={
            isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-between border-border bg-background px-3 text-[10px] font-bold uppercase text-foreground shadow-sm hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-2">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      Actions
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                  <AiExamGenerator 
                    onGenerated={handleAiGenerated} 
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                        <WandSparkles className="mr-2 h-4 w-4" /> AI Generate
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuItem onClick={() => setIsAddOpen(true)} disabled={!selectedTopic} className="cursor-pointer">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                  <AiExamGenerator onGenerated={handleAiGenerated} />
                  <Button size="sm" className="h-9 px-6 text-[10px] font-black uppercase tracking-tight shadow-md gap-2" onClick={() => setIsAddOpen(true)} disabled={!selectedTopic}>
                      <PlusCircle className="h-4 w-4" /> Add Question
                  </Button>
              </div>
            )
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
        </div>
        
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <div className="p-0">
                {/* --- DESKTOP TABLE VIEW --- */}
                <div className="hidden lg:block">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                            <TableHead className="text-[10px] uppercase font-bold px-6 py-3 tracking-wider">Question Text</TableHead>
                            <TableHead className="w-24 text-center text-[10px] uppercase font-bold tracking-wider">Options</TableHead>
                            <TableHead className="w-24 text-right text-[10px] uppercase font-bold px-6 tracking-wider">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/5 transition-colors">
                                <TableCell className="font-bold text-sm text-foreground py-4 px-6">
                                    <p className="line-clamp-2 leading-relaxed">&quot;{item.text}&quot;</p>
                                </TableCell>
                                <TableCell className="text-center font-black text-[10px] text-muted-foreground opacity-50 uppercase tracking-tighter">
                                    {item.options.length} OPTS
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" className="h-8 w-8 text-primary border-slate-300" onClick={() => setEditingItem(item)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <DeleteQuestionButton item={item} tenantId={tenantId!} selectedTopic={selectedTopic} />
                                    </div>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* --- MOBILE CARD VIEW --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden p-4">
                    {filteredItems.map((item) => (
                        <Card key={item.id} className="shadow-none border-slate-200 overflow-hidden">
                            <div className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{selectedTopic}</span>
                                <Badge variant="outline" className="text-[9px] font-black uppercase">{item.options.length} OPTIONS</Badge>
                            </div>
                            <CardContent className="p-4 py-3">
                                <p className="text-sm font-bold text-foreground line-clamp-3 leading-relaxed">&quot;{item.text}&quot;</p>
                            </CardContent>
                            <CardFooter className="p-2 border-t bg-muted/5 flex gap-2">
                                <Button variant="outline" size="compact" className="flex-1 border-slate-300" onClick={() => setEditingItem(item)}>
                                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                </Button>
                                <DeleteQuestionButton item={item} tenantId={tenantId!} selectedTopic={selectedTopic} />
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {filteredItems.length === 0 && !isLoading && (
                    <div className="h-64 text-center text-muted-foreground italic flex flex-col items-center justify-center gap-4 opacity-20">
                        <Library className="h-16 w-16" />
                        <div className="space-y-1">
                            <p className="text-lg font-black uppercase tracking-tighter">Empty Topic Database</p>
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
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const storedPool = localStorage.getItem('safeviate.question-pool');
            const currentPool = storedPool ? JSON.parse(storedPool) : [];
            const nextPool = currentPool.filter((p: any) => p.id !== item.id);
            localStorage.setItem('safeviate.question-pool', JSON.stringify(nextPool));
            
            window.dispatchEvent(new Event('safeviate-question-bank-updated'));
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
                        className="bg-destructive hover:bg-destructive/90 text-[10px] font-black uppercase"
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
    const { toast } = useToast();
    const isMobile = useIsMobile();
    
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

        setIsSaving(true);

        try {
            const data = {
                id: editingItem?.id || crypto.randomUUID(),
                topic,
                text,
                options,
                correctOptionId: correctId,
                createdAt: editingItem?.createdAt || new Date().toISOString()
            };

            const storedPool = localStorage.getItem('safeviate.question-pool');
            const currentPool = storedPool ? JSON.parse(storedPool) : [];
            
            let nextPool;
            if (editingItem) {
                nextPool = currentPool.map((p: any) => p.id === editingItem.id ? data : p);
                toast({ title: 'Question Updated' });
            } else {
                nextPool = [data, ...currentPool];
                toast({ title: 'Question Added' });
            }
            
            localStorage.setItem('safeviate.question-pool', JSON.stringify(nextPool));
            window.dispatchEvent(new Event('safeviate-question-bank-updated'));
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className={isMobile ? "max-w-[95vw] w-full p-4" : "sm:max-w-2xl"}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingItem ? 'Edit Question' : 'Add Question'}</DialogTitle>
                    <DialogDescription className="text-sm font-medium">
                        Adding to the <span className="font-bold text-primary">{topic}</span> database.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Question Text</Label>
                            <Textarea 
                                value={text} 
                                onChange={(e) => setText(e.target.value)} 
                                placeholder="Enter the technical question..." 
                                className="min-h-[120px] bg-muted/5 font-medium text-sm leading-relaxed" 
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Options (Select One Correct Answer)</Label>
                                {!correctId && <Badge variant="destructive" className="h-5 text-[8px] font-black uppercase animate-pulse">SELECTION REQUIRED</Badge>}
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
                                                    <Badge className="h-4 text-[8px] font-black uppercase bg-green-600 text-white border-none gap-1">
                                                        <CheckCircle2 className="h-2 w-2" /> CORRECT
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
                                                className="border-none bg-transparent shadow-none focus-visible:ring-0 h-8 p-0 text-sm font-bold text-foreground"
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
                                size="compact" 
                                onClick={() => setOptions([...options, { id: uuidv4(), text: '' }])} 
                                className="w-full h-10 border-dashed border-2 hover:bg-muted/10 border-slate-300"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Option
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4 bg-muted/5 -mx-6 px-6 flex-col sm:flex-row gap-2">
                    <div className={cn("flex items-center gap-2 mr-auto text-muted-foreground", isMobile && "mb-2")}>
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">2+ opts & 1 correct required.</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <DialogClose asChild><Button variant="outline" size="compact" className="flex-1 sm:flex-none border-slate-300">Cancel</Button></DialogClose>
                        <Button onClick={handleSave} size="compact" disabled={isSaving} className="flex-1 sm:flex-none">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingItem ? 'Update' : 'Save')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
