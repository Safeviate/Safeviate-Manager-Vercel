'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Search, PlusCircle, Pencil, Trash2, ClipboardCheck, PlayCircle, ShieldCheck, Microscope, Database, MoreHorizontal } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function ExamsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [takingExam, setTakingExam] = useState<{ template: ExamTemplate; isMock: boolean } | null>(null);

  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<string>('10');
  const [activeTab, setActiveTab] = useState('internal');

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

    const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
    const count = Math.min(Number(questionCount), shuffled.length);
    const selectedQuestions = shuffled.slice(0, count);

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

  const examTabs = [
    { value: 'internal', label: 'Internal Exams', icon: ShieldCheck },
    { value: 'mock', label: 'Mock Exams', icon: Microscope },
  ];

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <Card className="flex-1 flex flex-col shadow-none border overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <MainPageHeader 
            title="Examinations"
            actions={
              isMobile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="compact" variant="outline" className="gap-2">
                      <MoreHorizontal className="h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setActiveTab('internal')}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> View Internal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab('mock')}>
                      <Microscope className="mr-2 h-4 w-4" /> View Mocks
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/training/exams/new">
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Template
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex min-w-max flex-nowrap">
                    <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2 text-[10px] font-black uppercase">
                      <ShieldCheck className="h-4 w-4" /> Internal Exams (Official)
                    </TabsTrigger>
                    <TabsTrigger value="mock" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2 text-[10px] font-black uppercase">
                      <Microscope className="h-4 w-4" /> Mock Exams (Practice)
                    </TabsTrigger>
                  </TabsList>
                  {canManage && (
                    <Button asChild size="sm" className="h-9 px-6 text-[10px] font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2 shrink-0">
                      <Link href="/training/exams/new">
                        <PlusCircle className="h-4 w-4" /> Create Exam Template
                      </Link>
                    </Button>
                  )}
                </>
              )
            }
          />

          <TabsContent value="internal" className="flex-1 min-h-0 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-8 p-4 pb-16 sm:gap-10 sm:p-6 sm:pb-20">
                
                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Available Exam Templates
                      </h3>
                      <p className="text-xs text-muted-foreground italic">Conduct a certified examination. Results are permanently recorded.</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Search templates..." 
                        className="pl-9 h-9 text-xs bg-background" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border overflow-hidden">
                    {isLoadingTemplates ? (
                      <div className="p-8 space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-md" />)}
                      </div>
                    ) : filteredTemplates.length > 0 ? (
                      <>
                        <div className="grid gap-3 p-3 sm:hidden">
                          {filteredTemplates.map((template) => (
                            <div key={template.id} className="rounded-lg border bg-background p-3 shadow-sm">
                              <div className="space-y-1">
                                <p className="text-sm font-bold leading-tight">{template.title}</p>
                                <p className="text-xs text-muted-foreground">{template.subject}</p>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <Badge variant="outline" className="text-[10px] font-black text-primary uppercase">
                                  PASS {template.passingScore}%
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="default"
                                    size="compact"
                                    onClick={() => setTakingExam({ template, isMock: false })}
                                  >
                                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Start
                                  </Button>
                                  {canManage && (
                                    <>
                                      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                        <Link href={`/training/exams/${template.id}/edit`}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Link>
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(template.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="hidden overflow-x-auto sm:block">
                          <Table>
                            <TableHeader className="bg-muted/30">
                              <TableRow>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Exam Title</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Subject</TableHead>
                                <TableHead className="text-center text-[10px] uppercase font-bold tracking-wider">Pass Mark</TableHead>
                                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredTemplates.map((template) => (
                                <tr key={template.id} className="group border-b transition-colors hover:bg-muted/50">
                                  <td className="p-4 align-middle text-sm font-bold text-foreground whitespace-nowrap">{template.title}</td>
                                  <td className="p-4 align-middle text-sm font-medium text-foreground whitespace-nowrap">{template.subject}</td>
                                  <td className="p-4 align-middle text-center text-sm font-black text-primary whitespace-nowrap">{template.passingScore}%</td>
                                  <td className="p-4 align-middle text-right whitespace-nowrap">
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        variant="default" 
                                        size="compact" 
                                        onClick={() => setTakingExam({ template, isMock: false })}
                                      >
                                        <PlayCircle className="h-3.5 w-3.5" /> Start Official Exam
                                      </Button>
                                      {canManage && (
                                        <>
                                          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                            <Link href={`/training/exams/${template.id}/edit`}>
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Link>
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(template.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 bg-muted/5">
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground opacity-40">No templates available.</p>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      Official Records
                    </h3>
                    <p className="text-xs text-muted-foreground italic">Certified results for non-mock examinations.</p>
                  </div>

                  <div className="rounded-xl border overflow-hidden">
                    {isLoadingResults ? (
                      <div className="p-8 space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-md" />)}
                      </div>
                    ) : results?.filter(r => !r.isMock).length ? (
                      <>
                        <div className="grid gap-3 p-3 sm:hidden">
                          {results.filter(r => !r.isMock).map(res => (
                            <div key={res.id} className="rounded-lg border bg-background p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-sm font-bold leading-tight">{res.templateTitle}</p>
                                  <p className="text-xs text-muted-foreground">{res.studentName}</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{format(new Date(res.date), 'dd MMM yy HH:mm')}</p>
                                </div>
                                <Badge variant={res.passed ? "default" : "destructive"} className="h-5 text-[9px] font-black uppercase">
                                  {res.passed ? 'PASSED' : 'FAILED'}
                                </Badge>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">Score</span>
                                <span className="text-sm font-black">{res.score}%</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="hidden overflow-x-auto sm:block">
                          <Table>
                            <TableHeader className="bg-muted/30">
                              <TableRow>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Date</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Student</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Exam</TableHead>
                                <TableHead className="text-center text-[10px] uppercase font-bold tracking-wider">Score</TableHead>
                                <TableHead className="text-center text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {results.filter(r => !r.isMock).map(res => (
                                <TableRow key={res.id}>
                                  <TableCell className="text-[10px] font-mono font-bold text-muted-foreground whitespace-nowrap">{format(new Date(res.date), 'dd MMM yy HH:mm')}</TableCell>
                                  <TableCell className="font-bold text-sm text-foreground whitespace-nowrap">{res.studentName}</TableCell>
                                  <TableCell className="text-sm font-medium text-foreground max-w-[240px] truncate">{res.templateTitle}</TableCell>
                                  <TableCell className="text-center font-black text-sm text-foreground whitespace-nowrap">{res.score}%</TableCell>
                                  <TableCell className="text-center whitespace-nowrap">
                                    <Badge variant={res.passed ? "default" : "destructive"} className="text-[10px] font-black uppercase py-0.5 px-3">
                                      {res.passed ? 'PASSED' : 'FAILED'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 bg-muted/5">
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground opacity-40">No official records found.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="mock" className="flex-1 min-h-0 overflow-hidden m-0">
            <ScrollArea className="h-full">
                <div className="p-4 space-y-8 sm:p-6 pb-20">
                    <div className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
                        <div className="space-y-2 text-center">
                            <h3 className="text-lg font-black uppercase tracking-tight text-primary">Dynamic Practice Run</h3>
                            <p className="text-xs text-muted-foreground italic">Select a topic to generate a randomized mock exam from the database.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Aviation Topic</Label>
                                <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                                    <SelectTrigger className="h-12 font-bold">
                                        <Database className="h-4 w-4 mr-2 text-primary" />
                                        <SelectValue placeholder="Select Topic..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(topicsData?.topics || []).map(t => <SelectItem key={t} value={t} className="font-medium">{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Quantity</Label>
                                <Select onValueChange={setQuestionCount} value={questionCount}>
                                    <SelectTrigger className="h-12 font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5" className="font-medium">5 Questions</SelectItem>
                                        <SelectItem value="10" className="font-medium">10 Questions</SelectItem>
                                        <SelectItem value="20" className="font-medium">20 Questions</SelectItem>
                                        <SelectItem value="50" className="font-medium">50 Questions</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button 
                            onClick={handleStartTopicExam} 
                            disabled={!selectedTopic}
                            className="w-full h-14 text-lg font-black shadow-lg gap-3 uppercase tracking-tighter"
                        >
                            <PlayCircle className="h-6 w-6" /> START RANDOMIZED MOCK
                        </Button>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            Fixed Exam Templates (Practice)
                        </h3>
                        <div className="rounded-xl border overflow-hidden bg-card">
                            <>
                              <div className="grid gap-3 p-3 sm:hidden">
                                {templates?.map((template) => (
                                  <div key={template.id} className="rounded-lg border bg-background p-3 shadow-sm">
                                    <div className="space-y-1">
                                      <p className="text-sm font-bold leading-tight">{template.title}</p>
                                      <p className="text-xs text-muted-foreground">{template.subject}</p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="compact"
                                      className="mt-3 w-full bg-primary/5 hover:bg-primary/10 border-primary/20"
                                      onClick={() => setTakingExam({ template, isMock: true })}
                                    >
                                      <PlayCircle className="h-3.5 w-3.5" /> Start Practice Run
                                    </Button>
                                  </div>
                                ))}
                                {(!templates || templates.length === 0) && (
                                  <div className="py-8 text-center bg-muted/5 italic uppercase font-bold tracking-widest text-[10px] text-muted-foreground">
                                    No fixed templates available for practice.
                                  </div>
                                )}
                              </div>

                              <div className="hidden overflow-x-auto sm:block">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Exam Title</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Subject</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {templates?.map((template) => (
                                        <TableRow key={template.id} className="group">
                                        <TableCell className="font-bold text-sm text-foreground whitespace-nowrap">{template.title}</TableCell>
                                        <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{template.subject}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <Button 
                                                variant="outline" 
                                                size="compact" 
                                                className="bg-primary/5 hover:bg-primary/10 border-primary/20"
                                                onClick={() => setTakingExam({ template, isMock: true })}
                                            >
                                                <PlayCircle className="h-3.5 w-3.5" /> Start Practice Run
                                            </Button>
                                        </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!templates || templates.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center bg-muted/5 italic uppercase font-bold tracking-widest text-[10px] text-muted-foreground">
                                                No fixed templates available for practice.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    </TableBody>
                                </Table>
                              </div>
                            </>
                        </div>
                    </div>
                </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>

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
