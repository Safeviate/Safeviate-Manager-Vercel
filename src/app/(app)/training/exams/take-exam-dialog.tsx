'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    GraduationCap, 
    PlayCircle,
    ChevronRight,
    Trophy,
    History
} from 'lucide-react';
import { format } from 'date-fns';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { ExamTemplate, ExamResult } from '@/types/training';
import type { Personnel, PilotProfile } from '@/app/(app)/users/personnel/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TakeExamDialogProps {
  template: ExamTemplate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: (Personnel | PilotProfile)[];
  tenantId: string;
}

type ExamState = 'setup' | 'taking' | 'finished';

export function TakeExamDialog({ template, isOpen, onOpenChange, personnel, tenantId }: TakeExamDialogProps) {
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();

  const [state, setState] = useState<ExamState>('setup');
  const [isMock, setIsMock] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(userProfile?.id || '');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExamResult | null>(null);

  const students = useMemo(() => 
    personnel.filter(p => p.userType === 'Student' || p.userType === 'Private Pilot'),
    [personnel]
  );

  const resetExam = () => {
    setState('setup');
    setAnswers({});
    setResult(null);
    setIsMock(true);
    setSelectedStudentId(userProfile?.id || '');
  };

  const handleStart = () => {
    if (!selectedStudentId && !isMock) {
        toast({ variant: 'destructive', title: 'Selection Required', description: 'Please select a student for record keeping, or use Mock Mode.' });
        return;
    }
    setState('taking');
  };

  const handleSubmit = async () => {
    const totalQuestions = template.questions.length;
    let correctCount = 0;

    template.questions.forEach((q) => {
      if (answers[q.id] === q.correctOptionId) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= template.passingScore;
    const selectedStudent = personnel.find(p => p.id === selectedStudentId);

    const examResult: ExamResult = {
      id: '', // Will be set by Firestore
      templateId: template.id,
      templateTitle: template.title,
      studentId: selectedStudentId,
      studentName: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Anonymous',
      date: new Date().toISOString(),
      score,
      passingScore: template.passingScore,
      passed,
      isMock,
    };

    if (firestore) {
      const resultsCol = collection(firestore, `tenants/${tenantId}/student-exam-results`);
      addDocumentNonBlocking(resultsCol, examResult);
      toast({ 
        title: isMock ? 'Practice Attempt Logged' : 'Official Result Recorded', 
        description: isMock 
            ? 'This session has been saved to the Mock Exams log.' 
            : 'This result has been added to the student training file.' 
      });
    }

    setResult(examResult);
    setState('finished');
  };

  const progress = (Object.keys(answers).length / template.questions.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetExam(); onOpenChange(open); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b bg-muted/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {template.title}
              </DialogTitle>
              <DialogDescription>{template.subject} • Pass Mark: {template.passingScore}%</DialogDescription>
            </div>
            {state === 'taking' && (
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Progress</p>
                    <p className="text-lg font-mono font-bold">{Object.keys(answers).length} / {template.questions.length}</p>
                </div>
            )}
          </div>
          {state === 'taking' && <Progress value={progress} className="h-1.5 mt-4" />}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          {state === 'setup' && (
            <div className="p-10 space-y-8 max-w-md mx-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-xl bg-primary/5 border-primary/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="mock-mode" className="text-base font-bold">Practice (Mock) Mode</Label>
                    <p className="text-xs text-muted-foreground italic">Provide score only, do not save to permanent record.</p>
                  </div>
                  <Switch id="mock-mode" checked={isMock} onCheckedChange={setIsMock} />
                </div>

                {!isMock && (
                  <div className="space-y-2 pt-2">
                    <Label>Assign Result To Student</Label>
                    <Select onValueChange={setSelectedStudentId} value={selectedStudentId}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-dashed text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This exam contains <span className="font-bold text-foreground">{template.questions.length} questions</span>. 
                  Ensure you have a stable connection before beginning.
                </p>
              </div>

              <Button onClick={handleStart} className="w-full h-14 text-lg gap-2 shadow-lg" size="lg">
                <PlayCircle className="h-5 w-5" /> Start Examination
              </Button>
            </div>
          )}

          {state === 'taking' && (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-10 pb-24">
                {template.questions.map((q, idx) => (
                  <div key={q.id} className="space-y-4">
                    <div className="flex gap-4">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0 border-primary text-primary font-bold">
                        {idx + 1}
                      </Badge>
                      <p className="text-base font-medium pt-0.5">{q.text}</p>
                    </div>
                    <RadioGroup 
                      value={answers[q.id]} 
                      onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10"
                    >
                      {q.options.map(opt => (
                        <div key={opt.id} className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                            answers[q.id] === opt.id ? "bg-primary/5 border-primary" : "bg-background"
                        )}>
                          <RadioGroupItem value={opt.id} id={opt.id} />
                          <Label htmlFor={opt.id} className="text-sm font-normal cursor-pointer flex-1">{opt.text}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {state === 'finished' && result && (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
              <div className={cn(
                "h-24 w-24 rounded-full flex items-center justify-center shadow-xl animate-in zoom-in duration-500",
                result.passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              )}>
                {result.passed ? <Trophy className="h-12 w-12" /> : <XCircle className="h-12 w-12" />}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-3xl font-black">{result.passed ? 'EXAM PASSED' : 'EXAM FAILED'}</h3>
                <p className="text-muted-foreground">Final Score: <span className={cn("font-black text-xl", result.passed ? 'text-green-600' : 'text-red-600')}>{result.score}%</span></p>
                <p className="text-xs uppercase font-bold tracking-widest opacity-50">Target to Pass: {result.passingScore}%</p>
              </div>

              <div className="w-full max-w-sm p-4 bg-muted/20 rounded-xl border space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Student</span>
                    <span className="font-bold">{result.studentName}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant={result.isMock ? "secondary" : "default"} className="h-5 py-0 text-[10px]">
                        {result.isMock ? 'MOCK EXAM' : 'OFFICIAL RECORD'}
                    </Badge>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-mono text-xs">{format(new Date(result.date), 'dd MMM yyyy HH:mm')}</span>
                </div>
              </div>

              {result.isMock && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2 text-[10px] text-amber-800">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Practice run recorded. You can review this attempt in the Mock Exams tab.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-muted/5 shrink-0 gap-2">
          {state === 'taking' ? (
            <Button 
                onClick={handleSubmit} 
                disabled={Object.keys(answers).length < template.questions.length}
                className="w-full md:w-auto px-10"
            >
              Submit Examination
            </Button>
          ) : state === 'finished' ? (
            <Button onClick={() => onOpenChange(false)} className="w-full md:w-auto px-10">Close Result</Button>
          ) : (
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
