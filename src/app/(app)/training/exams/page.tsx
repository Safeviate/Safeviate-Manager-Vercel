'use client';

import { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileEdit, Search, PlusCircle, Pencil, Trash2, GraduationCap, ClipboardCheck, PlayCircle, History, CheckCircle2, XCircle, ShieldCheck, Microscope } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/use-permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExamForm, type ExamFormValues } from './exam-form';
import { useToast } from '@/hooks/use-toast';
import type { ExamTemplate, ExamResult } from '@/types/training';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TakeExamDialog } from './take-exam-dialog';
import type { Personnel, PilotProfile } from '../../users/personnel/page';
import { Separator } from '@/components/ui/separator';

export default function ExamsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Take Exam State
  const [takingExam, setTakingExam] = useState<ExamTemplate | null>(null);

  const canManage = hasPermission('training-exams-manage');

  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/exam-templates`), orderBy('createdAt', 'desc')) : null),
    [firestore, tenantId]
  );

  const resultsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/student-exam-results`), orderBy('date', 'desc')) : null),
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
  const { data: personnel } = useCollection<Personnel>(personnelQuery);
  const { data: instructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students } = useCollection<PilotProfile>(studentsQuery);

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

  const officialResults = useMemo(() => results?.filter(r => !r.isMock) || [], [results]);
  const mockResults = useMemo(() => results?.filter(r => r.isMock) || [], [results]);

  const handleCreateOrUpdate = async (values: ExamFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const data = {
        ...values,
        createdAt: editingExam?.createdAt || new Date().toISOString(),
      };

      if (editingExam) {
        const docRef = doc(firestore, `tenants/${tenantId}/exam-templates`, editingExam.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Exam Updated', description: `"${values.title}" has been updated.` });
      } else {
        const colRef = collection(firestore, `tenants/${tenantId}/exam-templates`);
        addDocumentNonBlocking(colRef, data);
        toast({ title: 'Exam Created', description: `"${values.title}" template is now available.` });
      }
      setIsFormOpen(false);
      setEditingExam(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Are you sure you want to delete this exam template?')) return;
    try {
      await deleteDoc(doc(firestore, `tenants/${tenantId}/exam-templates`, id));
      toast({ title: 'Exam Deleted' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };

  const isLoading = isLoadingTemplates || isLoadingResults;

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Examinations</h1>
          <p className="text-muted-foreground">Manage multiple-choice exam templates and track student results.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditingExam(null); setIsFormOpen(true); }} className="gap-2 shadow-md">
            <PlusCircle className="h-4 w-4" /> Create Exam Template
          </Button>
        )}
      </div>

      <Tabs defaultValue="internal" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
              <GraduationCap className="h-4 w-4" /> Internal Exams
            </TabsTrigger>
            <TabsTrigger value="mock" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
              <Microscope className="h-4 w-4" /> Mock Exams ({mockResults.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="internal" className="flex-1 min-h-0 overflow-hidden">
          <Card className="h-full flex flex-col overflow-hidden shadow-none border">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-10 p-6 pb-20">
                
                {/* --- Template Management Section --- */}
                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        Available Templates
                      </h3>
                      <p className="text-xs text-muted-foreground">Select a template to initiate a formal examination.</p>
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
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[10px] gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/20 font-bold"
                                    onClick={() => setTakingExam(template)}
                                  >
                                    <PlayCircle className="h-3.5 w-3.5" /> Take Exam
                                  </Button>
                                  {canManage && (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingExam(template); setIsFormOpen(true); }}>
                                        <Pencil className="h-3.5 w-3.5" />
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
                        <ClipboardCheck className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-sm font-medium">No templates matching your search.</p>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* --- Official Records Section --- */}
                <section className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                      Official Records
                    </h3>
                    <p className="text-xs text-muted-foreground">Historical passing and failing results for non-mock examinations.</p>
                  </div>

                  <div className="rounded-md border bg-card overflow-hidden">
                    {isLoadingResults ? (
                      <div className="p-8 space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-md" />)}
                      </div>
                    ) : officialResults.length > 0 ? (
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
                          {officialResults.map(res => (
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

        <TabsContent value="mock" className="flex-1 min-h-0">
          <Card className="h-full flex flex-col overflow-hidden shadow-none border">
            <CardHeader className="shrink-0 border-b bg-muted/5">
                <CardTitle>Mock Examination History</CardTitle>
                <CardDescription>Review practice attempts and non-certified student trials.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                    {isLoadingResults ? (
                        <div className="p-8 space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-muted animate-pulse rounded-md" />)}
                        </div>
                    ) : mockResults.length > 0 ? (
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold">Person</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold">Exam</TableHead>
                                    <TableHead className="text-center text-[10px] uppercase font-bold">Score</TableHead>
                                    <TableHead className="text-center text-[10px] uppercase font-bold">Outcome</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockResults.map(res => (
                                    <TableRow key={res.id}>
                                        <TableCell className="text-[10px] font-mono">{format(new Date(res.date), 'dd MMM yy HH:mm')}</TableCell>
                                        <TableCell className="font-semibold text-xs">{res.studentName}</TableCell>
                                        <TableCell className="text-xs">{res.templateTitle}</TableCell>
                                        <TableCell className="text-center font-bold text-xs">{res.score}%</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn("h-5 text-[9px] font-bold", res.passed ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50")}>
                                                {res.passed ? 'WOULD PASS' : 'WOULD FAIL'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-24 opacity-40">
                            <Microscope className="h-16 w-16 mx-auto mb-4" />
                            <p className="text-lg font-medium">No practice attempts found.</p>
                            <p className="text-sm">Mock exams taken by users will appear here for review.</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); setEditingExam(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-muted/5 shrink-0">
            <DialogTitle>{editingExam ? 'Edit Exam Template' : 'Create New Exam'}</DialogTitle>
            <DialogDescription>Define multiple-choice questions and set the passing criteria.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ExamForm 
              initialValues={editingExam || undefined}
              onSubmit={handleCreateOrUpdate}
              onCancel={() => setIsFormOpen(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>

      {takingExam && (
          <TakeExamDialog
            template={takingExam}
            isOpen={!!takingExam}
            onOpenChange={(open) => !open && setTakingExam(null)}
            personnel={allPeople}
            tenantId={tenantId}
          />
      )}
    </div>
  );
}
