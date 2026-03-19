'use client';

import { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileEdit, Search, PlusCircle, Pencil, Trash2, GraduationCap, ClipboardCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/use-permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExamForm, type ExamFormValues } from './exam-form';
import { useToast } from '@/hooks/use-toast';
import type { ExamTemplate } from '@/types/training';
import { format } from 'date-fns';

export default function ExamsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = hasPermission('training-exams-manage');

  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/exam-templates`), orderBy('createdAt', 'desc')) : null),
    [firestore, tenantId]
  );

  const { data: templates, isLoading } = useCollection<ExamTemplate>(templatesQuery);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

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

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Examinations</h1>
          <p className="text-muted-foreground">Manage multiple-choice exam templates and track subject-specific requirements.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditingExam(null); setIsFormOpen(true); }} className="gap-2 shadow-md">
            <PlusCircle className="h-4 w-4" /> Create Exam Template
          </Button>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title or subject..." 
              className="pl-9 bg-background" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {filteredTemplates.length} TEMPLATES DEFINED
          </Badge>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : filteredTemplates.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Exam Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Questions</TableHead>
                    <TableHead className="text-center">Pass Mark</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="group">
                      <TableCell className="font-bold">{template.title}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">{template.questions.length}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">{template.passingScore}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { setEditingExam(template); setIsFormOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(template.id)}
                              >
                                <Trash2 className="h-4 w-4" />
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
              <div className="text-center py-24 opacity-40">
                <ClipboardCheck className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-medium">No exam templates found.</p>
                <p className="text-sm">Create templates to begin conducting student assessments.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

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
    </div>
  );
}