'use client';

import { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Trash2, Library, Wand2, Filter, Pencil, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { QuestionBankItem, ExamQuestion } from '@/types/training';
import { AiExamGenerator } from '../exams/ai-exam-generator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

const AVIATION_TOPICS = [
    'Air Law',
    'Aircraft General Knowledge',
    'Flight Performance & Planning',
    'Human Performance',
    'Meteorology',
    'Navigation',
    'Operational Procedures',
    'Principles of Flight',
    'Communications'
];

export default function QuestionBankPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | 'All'>('All');
  const [editingItem, setEditingItem] = useState<QuestionBankItem | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const poolQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/question-pool`), orderBy('createdAt', 'desc')) : null),
    [firestore, tenantId]
  );
  const { data: poolItems, isLoading } = useCollection<QuestionBankItem>(poolQuery);

  const filteredItems = useMemo(() => {
    if (!poolItems) return [];
    return poolItems.filter(item => {
      const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTopic = selectedTopic === 'All' || item.topic === selectedTopic;
      return matchesSearch && matchesTopic;
    });
  }, [poolItems, searchQuery, selectedTopic]);

  const handleAiGenerated = async (questions: any[]) => {
    if (!firestore) return;
    
    // Fallback if AI didn't provide a topic
    const defaultTopic = selectedTopic === 'All' ? AVIATION_TOPICS[0] : selectedTopic;
    
    const batch = writeBatch(firestore);
    const poolCol = collection(firestore, `tenants/${tenantId}/question-pool`);

    questions.forEach(q => {
        const docRef = doc(poolCol);
        batch.set(docRef, {
            ...q,
            topic: q.topic || defaultTopic,
            createdAt: new Date().toISOString()
        });
    });

    await batch.commit();
    toast({ title: 'Import Successful', description: `${questions.length} questions added and categorized.` });
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Delete this question from the bank?')) return;
    try {
      await deleteDoc(doc(firestore, `tenants/${tenantId}/question-pool`, id));
      toast({ title: 'Question Deleted' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Aviation Question Bank</h1>
          <p className="text-muted-foreground">Centralized repository of validated multiple-choice questions for training assessments.</p>
        </div>
        <div className="flex gap-2">
            <AiExamGenerator onGenerated={handleAiGenerated} />
            <Button onClick={() => setIsAddOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
            </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search keywords..." 
                    className="pl-9 bg-background" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                <SelectTrigger className="w-[200px] h-10 bg-background">
                    <Filter className="h-3.5 w-3.5 mr-2 opacity-50" />
                    <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Topics</SelectItem>
                    {AVIATION_TOPICS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] py-1 px-3">
            {filteredItems.length} QUESTIONS
          </Badge>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-32 text-[10px] uppercase font-bold">Topic</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Question Text</TableHead>
                  <TableHead className="w-24 text-center text-[10px] uppercase font-bold">Options</TableHead>
                  <TableHead className="w-20 text-right text-[10px] uppercase font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tight">
                            {item.topic}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm py-4">
                        <p className="line-clamp-2">{item.text}</p>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs opacity-50">
                        {item.options.length}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingItem(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && !isLoading && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                            <Library className="h-12 w-12 mx-auto mb-4 opacity-10" />
                            No questions found in the selected topic.
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
        tenantId={tenantId} 
        topics={AVIATION_TOPICS}
        defaultTopic={selectedTopic === 'All' ? undefined : selectedTopic}
        editingItem={editingItem}
      />
    </div>
  );
}

interface UpsertQuestionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    tenantId: string;
    topics: string[];
    defaultTopic?: string;
    editingItem?: QuestionBankItem | null;
}

function UpsertQuestionDialog({ isOpen, onOpenChange, tenantId, topics, defaultTopic, editingItem }: UpsertQuestionDialogProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [topic, setTopic] = useState(editingItem?.topic || defaultTopic || topics[0]);
    const [text, setText] = useState(editingItem?.text || '');
    const [options, setOptions] = useState<{ id: string; text: string }[]>(
        editingItem?.options || [
            { id: uuidv4(), text: '' },
            { id: uuidv4(), text: '' }
        ]
    );
    const [correctId, setCorrectId] = useState(editingItem?.correctOptionId || '');

    // Sync state when editingItem changes
    useMemo(() => {
        if (editingItem) {
            setTopic(editingItem.topic);
            setText(editingItem.text);
            setOptions(editingItem.options);
            setCorrectId(editingItem.correctOptionId);
        } else {
            setTopic(defaultTopic || topics[0]);
            setText('');
            setOptions([{ id: uuidv4(), text: '' }, { id: uuidv4(), text: '' }]);
            setCorrectId('');
        }
    }, [editingItem, defaultTopic, topics]);

    const handleSave = async () => {
        if (!text.trim() || !correctId || options.some(o => !o.text.trim())) {
            toast({ variant: 'destructive', title: 'Invalid Form', description: 'Ensure all fields are completed.' });
            return;
        }

        if (!firestore) return;

        const data = {
            topic,
            text,
            options,
            correctOptionId: correctId,
            createdAt: editingItem?.createdAt || new Date().toISOString()
        };

        if (editingItem) {
            const docRef = doc(firestore, `tenants/${tenantId}/question-pool`, editingItem.id);
            updateDocumentNonBlocking(docRef, data);
            toast({ title: 'Question Updated' });
        } else {
            const poolCol = collection(firestore, `tenants/${tenantId}/question-pool`);
            await addDocumentNonBlocking(poolCol, data);
            toast({ title: 'Question Added' });
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Question' : 'Add Question to Pool'}</DialogTitle>
                    <DialogDescription>
                        {editingItem ? 'Update the details of this bank question.' : 'Define a single multiple-choice question for the centralized bank.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Aviation Topic</Label>
                            <Select onValueChange={setTopic} value={topic}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter the technical question..." className="min-h-[100px]" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Options (Select Correct)</Label>
                            {options.map((opt, idx) => (
                                <div key={opt.id} className="flex gap-2 items-center">
                                    <input 
                                        type="radio" 
                                        name="correct" 
                                        checked={correctId === opt.id} 
                                        onChange={() => setCorrectId(opt.id)} 
                                        className="accent-primary"
                                    />
                                    <Input 
                                        value={opt.text} 
                                        onChange={(e) => {
                                            const next = [...options];
                                            next[idx].text = e.target.value;
                                            setOptions(next);
                                        }}
                                        placeholder={`Option ${idx + 1}`}
                                        className={cn(correctId === opt.id && "border-green-500 ring-1 ring-green-500")}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => setOptions(options.filter(o => o.id !== opt.id))} disabled={options.length <= 2}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => setOptions([...options, { id: uuidv4(), text: '' }])} className="mt-2">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4">
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave}>{editingItem ? 'Update Question' : 'Save to Bank'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
