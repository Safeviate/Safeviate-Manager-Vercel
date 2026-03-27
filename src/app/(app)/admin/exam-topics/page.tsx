'use client';

import { useState, useEffect } from 'react';
import { doc, collection, query, getDocs, where, writeBatch } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Pencil, Trash2, BookOpen, Save, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DeleteActionButton } from '@/components/record-action-buttons';

export interface ExamTopicsSettings {
    id: string;
    topics: string[];
}

const DEFAULT_TOPICS = [
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

export default function ExamTopicsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  
  const [newTopic, setNewTopic] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'exam-topics') : null),
    [firestore, tenantId]
  );

  const { data: settings, isLoading } = useDoc<ExamTopicsSettings>(settingsRef);

  useEffect(() => {
    if (!isLoading && !settings && firestore && settingsRef) {
        // Seed initial topics if none exist
        setDocumentNonBlocking(settingsRef, { id: 'exam-topics', topics: DEFAULT_TOPICS }, { merge: false });
    }
  }, [isLoading, settings, firestore, settingsRef]);

  const handleAddTopic = () => {
    if (!newTopic.trim()) return;
    if (settings?.topics.includes(newTopic.trim())) {
        toast({ variant: 'destructive', title: 'Duplicate Topic', description: 'This category already exists.' });
        return;
    }

    const updatedTopics = [...(settings?.topics || []), newTopic.trim()].sort();
    if (settingsRef) {
        setDocumentNonBlocking(settingsRef, { topics: updatedTopics }, { merge: true });
        setNewTopic('');
        toast({ title: 'Topic Added' });
    }
  };

  const handleDeleteTopic = async (topicToDelete: string) => {
    const updatedTopics = (settings?.topics || []).filter(t => t !== topicToDelete);
    if (settingsRef) {
        setDocumentNonBlocking(settingsRef, { topics: updatedTopics }, { merge: true });
        toast({ title: 'Topic Removed' });
    }
  };

  const handleStartEdit = (index: number, value: string) => {
    setEditingIndex(index);
    setEditingValue(value);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !settings || !settingsRef || !firestore) return;
    
    const oldName = settings.topics[editingIndex];
    const newName = editingValue.trim();

    if (!newName || oldName === newName) {
        setEditingIndex(null);
        return;
    }

    setIsSyncing(true);
    try {
        // 1. Update the list of topics
        const updatedTopics = [...settings.topics];
        updatedTopics[editingIndex] = newName;
        updatedTopics.sort();
        
        // 2. Perform a migration of all questions in the bank
        const poolCol = collection(firestore, `tenants/${tenantId}/question-pool`);
        const q = query(poolCol, where('topic', '==', oldName));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const batch = writeBatch(firestore);
            snapshot.docs.forEach(d => {
                batch.update(d.ref, { topic: newName });
            });
            await batch.commit();
            toast({ title: 'Database Synced', description: `Updated ${snapshot.size} questions to the new category name.` });
        }

        setDocumentNonBlocking(settingsRef, { topics: updatedTopics }, { merge: true });
        setEditingIndex(null);
        toast({ title: 'Topic Updated' });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 space-y-6 px-1"><Skeleton className="h-14 w-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader title="Exam Topics" />

        <div className="shrink-0 border-b bg-muted/5 p-4 lg:p-6 space-y-6">
            <Alert className="bg-primary/5 border-primary/20">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Synchronization Note</AlertTitle>
                <AlertDescription className="text-xs font-medium text-muted-foreground italic">
                Renaming a topic automatically updates all associated questions to maintain data integrity.
                </AlertDescription>
            </Alert>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Add New Subject</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Input 
                        placeholder="e.g., Radio Telephony, Human Factors..." 
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                        className="h-10 bg-background font-bold"
                    />
                    <Button onClick={handleAddTopic} disabled={!newTopic.trim()} className="h-10 w-full px-6 text-[10px] font-black uppercase sm:w-auto sm:shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Topic
                    </Button>
                </div>
            </div>
        </div>

        <div className="bg-muted/5 px-6 py-3 border-b">
            <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Active Database Topics</span>
            </div>
        </div>

        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-3 pb-20">
              {settings?.topics.map((topic, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl border group hover:bg-muted/5 transition-colors bg-background shadow-sm">
                  {editingIndex === idx ? (
                    <div className="flex items-center gap-3 flex-1">
                      <Input 
                        value={editingValue} 
                        onChange={(e) => setEditingValue(e.target.value)} 
                        className="h-10 font-bold" 
                        autoFocus
                        disabled={isSyncing}
                      />
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-emerald-600 hover:bg-emerald-50" onClick={handleSaveEdit} disabled={isSyncing}>
                            {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:bg-muted/10" onClick={() => setEditingIndex(null)} disabled={isSyncing}>
                            <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="h-8 w-8 rounded-full p-0 flex items-center justify-center font-black text-xs border-slate-300">
                          {idx + 1}
                        </Badge>
                        <span className="font-black text-sm uppercase text-foreground">{topic}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-9 w-9 border border-transparent hover:border-slate-200" onClick={() => handleStartEdit(idx, topic)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteActionButton
                          description={`This will remove "${topic}" from the available topics. Questions already in this bank will remain but will be uncategorized.`}
                          onDelete={() => handleDeleteTopic(topic)}
                          srLabel="Delete topic"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(!settings?.topics || settings.topics.length === 0) && (
                <div className="text-center py-20 text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest bg-muted/5 rounded-2xl border-2 border-dashed">
                    No custom topics defined.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
