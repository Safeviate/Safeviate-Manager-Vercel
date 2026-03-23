'use client';

import { useState, useEffect } from 'react';
import { doc, collection, query, getDocs, where, writeBatch } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Pencil, Trash2, BookOpen, Save, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
    if (!window.confirm(`Are you sure? This will remove "${topicToDelete}" from the available topics. Questions already in this bank will remain but will be uncategorized.`)) return;

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
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 h-full pb-10 overflow-hidden">
      <Alert className="bg-primary/5 border-primary/20 shrink-0">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertTitle>Important: Synchronization</AlertTitle>
        <AlertDescription className="text-xs">
          Renaming a topic here will automatically update all existing questions in that bank to maintain data integrity.
        </AlertDescription>
      </Alert>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        {/* --- STICKY HEADER SECTION --- */}
        <div className="bg-background border-b shrink-0">
          <CardHeader className="bg-muted/5 border-b py-4 px-6">
            <CardTitle className="text-sm flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" />
              Add New Subject
            </CardTitle>
            <div className="flex gap-2 mt-3">
              <Input 
                placeholder="e.g., Radio Telephony, Human Factors..." 
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                className="bg-background"
              />
              <Button onClick={handleAddTopic} disabled={!newTopic.trim()} className="shrink-0">
                Add Topic
              </Button>
            </div>
          </CardHeader>
          
          <div className="bg-muted/5 px-6 py-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-3 w-3" />
              Active Database Topics
            </CardTitle>
          </div>
        </div>

        {/* --- SCROLLABLE CONTENT SECTION --- */}
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-2">
              {settings?.topics.map((topic, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border group hover:bg-muted/10 transition-colors bg-background">
                  {editingIndex === idx ? (
                    <div className="flex items-center gap-2 flex-1 mr-4">
                      <Input 
                        value={editingValue} 
                        onChange={(e) => setEditingValue(e.target.value)} 
                        className="h-8" 
                        autoFocus
                        disabled={isSyncing}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveEdit} disabled={isSyncing}>
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingIndex(null)} disabled={isSyncing}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center font-bold text-[10px] bg-muted/5">
                          {idx + 1}
                        </Badge>
                        <span className="font-semibold text-sm">{topic}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(idx, topic)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTopic(topic)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(!settings?.topics || settings.topics.length === 0) && (
                <div className="text-center py-12 text-muted-foreground italic">
                    No custom topics defined. Standard aviation topics will be seeded automatically.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
