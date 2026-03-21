'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, PlusCircle, Pencil, Trash2, GraduationCap, ClipboardCheck, PlayCircle, ShieldCheck, Microscope, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import type { ExamTemplate, ExamResult, QuestionBankItem } from '@/types/training';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TakeExamDialog } from './take-exam-dialog';
import type { Personnel, PilotProfile } from '../../users/personnel/page';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import type { ExamTopicsSettings } from '../../admin/exam-topics/page';

export default function ExamsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  const [searchQuery, setSearchQuery] = useState('');
  const [takingExam, setTakingExam] = useState<{ template: ExamTemplate; isMock: boolean } | null>(null);

  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<string>('10');

  const canManage = hasPermission('training-exams-manage');

  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/exam-templates`), orderBy('title', 'asc')) : null),
    [firestore, tenantId]
  );

  const resultsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/student-exam-results`), orderBy('date', 'desc')) : null),
    [firestore, tenantId]
  );

  const poolQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/question-pool`)) : null),
    [firestore, tenantId]
  );

  const topicsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'exam-topics') : null),
    [firestore, tenantId]
  );

  const personnelQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );
  const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);

  const { data: templates, isLoading: isLoadingTemplates } = useCollection<ExamTemplate>(templatesQuery);
  const { data: results, isLoading: isLoadingResults } = useCollection<ExamResult>(resultsQuery);
  const { data: poolItems } = useCollection<QuestionBankItem>(poolQuery);
  const { data: topicsData } = useDoc<ExamTopicsSettings>(topicsRef);
  const { data: personnel } = useCollection<Personnel>(personnelQuery);
  const { data: instructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students } = useCollection<PilotProfile>(studentsQuery);

  useEffect(() => {
    if (topicsData?.topics?.length && !selectedTopic) {
        setSelectedTopic(topicsData.topics[0]);
    }
  }, [topicsData, selectedTopic]);

  const allPeople = useMemo(() => [
    ...(personnel || []),
    ...(instructors || []),
    ...(students || [])
  ], [personnel, instructors, students]);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Are you sure you want to delete this exam template?')) return;
    try {
      await deleteDoc(doc(firestore, `tenants/${tenantId}/exam-templates`, id));
      toast({ title: 'Exam Deleted' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };

  const handleStartTopicExam = () => {
    if (!selectedTopic) {
        toast({ variant: 'destructive', title: 'Selection Required', description: 'Please select an aviation topic.' });
        return;
    }

    const availableQuestions = poolItems?.filter(item => item.topic === selectedTopic) || [];
    if (availableQuestions.length === 0) {
        toast({ variant: 'destructive', title: 'Empty Topic', description: 'No questions found for this topic in the database.' });
        return;
    }

    // Shuffle and pick
    const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
    const count = Math.min(Number(questionCount), shuffled.length);
    const selectedQuestions = shuffled.slice(0, count);

    // Create transient template
    const transientTemplate: ExamTemplate = {
        id: `transient-${Date.now()}`,
        title: `Random Practice: ${selectedTopic}`,
        subject: selectedTopic,
        description: `Dynamically generated practice run from the question bank.`,
        passingScore: 75,
        questions: selectedQuestions,
        createdAt: new Date().toISOString()
    };

    setTakingExam({ template: transientTemplate, isMock: true });
  };

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Examinations</h1>
          <p className="text-muted-foreground">Manage official assessments and zero-persistence student practice runs.</p>
        </div>
        {canManage && (
          <div className="flex flex-col gap-1.5 md:items-end w-full md:w-auto">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Training Assets</p>
            <Button asChild size="sm" className="h-9 px-6 text-xs font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2">
                <Link href="/training/exams/new">
                <PlusCircle className="h-4 w-4" /> Create Exam
                </Link>
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="internal" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
              <ShieldCheck className="h-4 w-4" /> Internal Exams (Official)
            </TabsTrigger>
            <TabsTrigger value="mock" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
              <Microscope className="h-4 w-4" /> Mock Exams (Practice)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="internal" className="flex-1 min-h-0 overflow-hidden">
          <Card className="h-full flex flex-col overflow-hidden shadow-none border">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-10 p-6 pb-20">
                
                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2 font-headline">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        Available Exam Templates
                      </h3>
                      <p className="text-xs text-muted-foreground">Conduct a certified examination. Results are permanently recorded.</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Search templates..." 
                        className="pl-9 h-8 text-xs bg-background" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-md border bg-card overflow-hidden">
                    {isLoadingTemplates ? (
                      <div className="p-8 space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-md" />)}
                      </div>
                    ) : filteredTemplates.length > 0 ? (
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="text-[10px] uppercase font-bold">Exam Title</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Subject</TableHead>
                            <TableHead className="text-center text-[10px] uppercase font-bold">Pass Mark</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTemplates.map((template) => (
                            <TableRow key={template.id} className="group">
                              <TableCell className="font-bold text-sm">{template.title}</TableCell>
                              <TableCell className="text-xs">{template.subject}</TableCell>
                              <TableCell className="text-center font-bold text-primary text-xs">{template.passingScore}%</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="h-7 text-[10px] gap-1.5 font-black uppercase tracking-tighter"
                                    onClick={() => setTakingExam({ template, isMock: false })}
                                  >
                                    <PlayCircle className="h-3.5 w-3.5" /> Start Official Exam
                                  </Button>
                                  {canManage && (
                                    <>
                                      <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                                        <Link href={`/training/exams/${template.id}/edit`}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Link>
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(template.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 opacity-40">
                        <p className="text-sm font-medium italic">No templates available.</p>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold flex items-center gap-2 font-headline">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                      Official Records
                    </h3>
                    <p className="text-xs text-muted-foreground">Certified results for non-mock examinations.</p>
                  </div>

                  <div className="rounded-md border bg-card overflow-hidden">
                    {isLoadingResults ? (
                      <div className="p-8 space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-md" />)}
                      </div>
                    ) : results?.filter(r => !r.isMock).length ? (
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Student</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Exam</TableHead>
                            <TableHead className="text-center text-[10px] uppercase font-bold">Score</TableHead>
                            <TableHead className="text-center text-[10px] uppercase font-bold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.filter(r => !r.isMock).map(res => (
                            <TableRow key={res.id}>
                              <TableCell className="text-[10px] font-mono whitespace-nowrap">{format(new Date(res.date), 'dd MMM yy HH:mm')}</TableCell>
                              <TableCell className="font-semibold text-xs">{res.studentName}</TableCell>
                              <TableCell className="text-xs max-w-[200px] truncate">{res.templateTitle}</TableCell>
                              <TableCell className="text-center font-bold text-xs">{res.score}%</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={res.passed ? "default" : "destructive"} className="h-5 text-[9px] gap-1 font-black">
                                  {res.passed ? 'PASSED' : 'FAILED'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 opacity-40">
                        <p className="text-sm font-medium italic">No official records found.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="mock" className="flex-1 min-h-0 overflow-hidden">
          <Card className="h-full flex flex-col overflow-hidden shadow-none border">
            <CardHeader className="shrink-0 border-b bg-muted/5">
                <CardTitle>Mock Practice Area</CardTitle>
                <CardDescription>
                    Conduct practice runs without affecting official student records. Results in this tab are <strong>not saved</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
                <ScrollArea className="h-full">
                    <div className="p-6 space-y-8">
                        {/* --- TOPIC SELECTOR --- */}
                        <div className="max-w-2xl mx-auto space-y-6 bg-card border rounded-2xl p-8 shadow-sm">
                            <div className="space-y-2 text-center">
                                <h3 className="text-lg font-black uppercase tracking-tight text-primary">Dynamic Practice Run</h3>
                                <p className="text-xs text-muted-foreground">Select a topic to generate a randomized mock exam from the database.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Aviation Topic</Label>
                                    <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                                        <SelectTrigger className="h-12">
                                            <Database className="h-4 w-4 mr-2 text-primary" />
                                            <SelectValue placeholder="Select Topic..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(topicsData?.topics || []).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Quantity</Label>
                                    <Select onValueChange={setQuestionCount} value={questionCount}>
                                        <SelectTrigger className="h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5 Questions</SelectItem>
                                            <SelectItem value="10">10 Questions</SelectItem>
                                            <SelectItem value="20">20 Questions</SelectItem>
                                            <SelectItem value="50">50 Questions</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button 
                                onClick={handleStartTopicExam} 
                                disabled={!selectedTopic}
                                className="w-full h-14 text-lg font-black shadow-lg gap-3"
                            >
                                <PlayCircle className="h-6 w-6" /> START RANDOMIZED MOCK
                            </Button>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                Fixed Exam Templates (Practice)
                            </h3>
                            <div className="rounded-md border bg-card overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="text-[10px] uppercase font-bold">Exam Title</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold">Subject</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {templates?.map((template) => (
                                        <TableRow key={template.id} className="group">
                                        <TableCell className="font-bold text-sm">{template.title}</TableCell>
                                        <TableCell className="text-xs">{template.subject}</TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-[10px] gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/20 font-bold"
                                                onClick={() => setTakingExam({ template, isMock: true })}
                                            >
                                                <PlayCircle className="h-3.5 w-3.5" /> Start Practice Run
                                            </Button>
                                        </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!templates || templates.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                                                No fixed templates available for practice.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </CardContent>
        </TabsContent>
      </Tabs>

      {takingExam && (
          <TakeExamDialog
            template={takingExam.template}
            isOpen={!!takingExam}
            onOpenChange={(open) => !open && setTakingExam(null)}
            personnel={allPeople}
            tenantId={tenantId}
            isMockOnly={takingExam.isMock}
          />
      )}
    </div>
  );
}
