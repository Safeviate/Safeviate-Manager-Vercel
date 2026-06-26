'use client';

import React from 'react';
import { useFieldArray, useForm, FormProvider, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { InvestigationPhotoAttachment, InvestigationTask, InvestigationTaskUpdate, ReportDiscussionItem, SafetyReport } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, Save, Users, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Camera } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DocumentUploader } from '@/components/document-uploader';

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};

const toNoonUtcIso = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString();

const investigationMemberSchema = z.object({
  userId: z.string().min(1, 'Member is required.'),
  name: z.string(),
  role: z.enum(['Lead Investigator', 'Team Member', 'Technical Expert', 'Observer']),
});

const investigationTaskUpdateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  message: z.string(),
  timestamp: z.string(),
  taskStatus: z.enum(['Open', 'In Progress', 'Completed']).optional(),
});

const investigationTaskSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Task description is required.'),
  assigneeId: z.string().min(1, 'Assignee is required.'),
  dueDate: z.date(),
  status: z.enum(['Open', 'In Progress', 'Completed']),
  updates: z.array(investigationTaskUpdateSchema).optional(),
});

const investigationSchema = z.object({
  investigationTeam: z.array(investigationMemberSchema),
  investigationNotes: z.string().optional(),
  investigationTasks: z.array(investigationTaskSchema),
});

type FormValues = z.infer<typeof investigationSchema>;

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
  </div>
);

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={cn('text-[10px] font-black uppercase text-muted-foreground block tracking-widest', className)}>
    {children}
  </label>
);

const LocalSeparator = () => <div className="h-px w-full bg-slate-200/60 my-8" />;

interface InvestigationFormProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
  isStacked?: boolean;
  onReportSaved?: (updatedReport: SafetyReport) => void;
}

export function InvestigationForm({ report, tenantId, personnel, isStacked = false, onReportSaved }: InvestigationFormProps) {
  const { toast } = useToast();
  const { userProfile } = useUserProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      investigationTeam: report.investigationTeam || [],
      investigationNotes: report.investigationNotes || '',
      investigationTasks:
        report.investigationTasks?.map((task) => ({
          ...task,
          dueDate: parseLocalDate(task.dueDate),
          updates: task.updates || [],
        })) || [],
    },
  });

  const { fields: teamFields, append: appendTeamMember, remove: removeTeamMember } = useFieldArray({
    control: form.control,
    name: 'investigationTeam',
  });
  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({
    control: form.control,
    name: 'investigationTasks',
  });

  const buildDataToSave = (values: FormValues) => ({
    ...values,
    investigationTasks: values.investigationTasks.map((task) => ({
      ...task,
      dueDate: toNoonUtcIso(task.dueDate),
    })),
  });

  const getAssigneeName = (assigneeId: string) => {
    const person = personnel.find((item) => item.id === assigneeId);
    return person ? `${person.firstName} ${person.lastName}` : undefined;
  };

  const buildTaskHistoryEntries = (nextTasks: InvestigationTask[]) => {
    const previousTasks = report.investigationTasks || [];
    const previousTaskMap = new Map(previousTasks.map((task) => [task.id, task]));
    const historyEntries: ReportDiscussionItem[] = [];

    nextTasks.forEach((task) => {
      const previousTask = previousTaskMap.get(task.id);

      if (!previousTask) {
        historyEntries.push({
          id: uuidv4(),
          userId: userProfile?.id || 'system',
          userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'System',
          message: `Task created: ${task.description}`,
          timestamp: new Date().toISOString(),
          entryType: 'task_assignment',
          linkedTaskId: task.id,
          assignedToId: task.assigneeId,
          assignedToName: getAssigneeName(task.assigneeId),
          dueDate: task.dueDate,
          taskStatus: task.status,
        });
        return;
      }

      if (previousTask.status !== task.status) {
        historyEntries.push({
          id: uuidv4(),
          userId: userProfile?.id || 'system',
          userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'System',
          message: `Task status changed from ${previousTask.status} to ${task.status}: ${task.description}`,
          timestamp: new Date().toISOString(),
          entryType: 'status_change',
          linkedTaskId: task.id,
          assignedToId: task.assigneeId,
          assignedToName: getAssigneeName(task.assigneeId),
          dueDate: task.dueDate,
          taskStatus: task.status,
        });
      }
    });

    return historyEntries;
  };

  const persistInvestigation = async (values: FormValues, successTitle: string) => {
    const nextReport = {
      ...report,
      ...buildDataToSave(values),
    };
    const historyEntries = buildTaskHistoryEntries(nextReport.investigationTasks || []);
    const reportToSave = historyEntries.length > 0
      ? {
          ...nextReport,
          discussion: [...(report.discussion || []), ...historyEntries],
        }
      : nextReport;

    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: reportToSave }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save investigation details.');
      }

      const payload = await response.json().catch(() => null);
      onReportSaved?.((payload?.report as SafetyReport | undefined) ?? reportToSave);
      toast({ title: successTitle });
      return true;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save investigation details.',
      });
      return false;
    }
  };

  const onSubmit = async (values: FormValues) => {
    await persistInvestigation(values, 'Investigation Details Saved');
  };

  const handleUserSelection = (index: number, userId: string) => {
    const selectedUser = personnel.find((person) => person.id === userId);
    if (selectedUser) {
      form.setValue(`investigationTeam.${index}.name`, `${selectedUser.firstName} ${selectedUser.lastName}`);
      form.setValue(`investigationTeam.${index}.userId`, userId);
    }
  };

  const addTaskUpdate = async (taskIndex: number, message: string) => {
    if (!userProfile) return false;

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast({
        variant: 'destructive',
        title: 'Update required',
        description: 'Add a short feedback note before saving the task update.',
      });
      return false;
    }

    const currentTasks = form.getValues('investigationTasks');
    const task = currentTasks[taskIndex];
    if (!task) return false;

    const nextUpdate: InvestigationTaskUpdate = {
      id: uuidv4(),
      userId: userProfile.id,
      userName: `${userProfile.firstName} ${userProfile.lastName}`,
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
      taskStatus: task.status,
    };

    const previousUpdates = task.updates || [];
    form.setValue(`investigationTasks.${taskIndex}.updates`, [...previousUpdates, nextUpdate], {
      shouldDirty: true,
      shouldValidate: true,
    });

    const saved = await persistInvestigation(form.getValues(), 'Task feedback saved');
    if (!saved) {
      form.setValue(`investigationTasks.${taskIndex}.updates`, previousUpdates, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    return saved;
  };

  const saveEvidencePhotos = async (photos: InvestigationPhotoAttachment[], successTitle: string) => {
    const nextReport: SafetyReport = {
      ...report,
      ...buildDataToSave(form.getValues()),
      investigationEvidencePhotos: photos,
    };

    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: nextReport }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save investigation evidence.');
      }

      const payload = await response.json().catch(() => null);
      onReportSaved?.((payload?.report as SafetyReport | undefined) ?? nextReport);
      toast({ title: successTitle });
      return true;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Evidence save failed',
        description: error instanceof Error ? error.message : 'Unable to save investigation evidence.',
      });
      return false;
    }
  };

  const addEvidencePhoto = async (photo: { name: string; url: string; uploadDate: string }) => {
    const currentPhotos = report.investigationEvidencePhotos || [];
    const nextPhotos = [
      ...currentPhotos,
      {
        id: uuidv4(),
        name: photo.name,
        url: photo.url,
        uploadDate: photo.uploadDate,
      },
    ];
    await saveEvidencePhotos(nextPhotos, 'Investigation photo added');
  };

  const removeEvidencePhoto = async (photoId: string) => {
    const currentPhotos = report.investigationEvidencePhotos || [];
    const nextPhotos = currentPhotos.filter((photo) => photo.id !== photoId);
    await saveEvidencePhotos(nextPhotos, 'Investigation photo removed');
  };

  return (
    <div className={cn('flex flex-col h-full', !isStacked && 'overflow-hidden')}>
      <div className="shrink-0 border-b bg-muted/5 p-4">
        <h3 className="text-lg font-black uppercase tracking-tight">Investigation Management</h3>
      </div>
      <div className={cn('flex-1 p-0 overflow-hidden flex flex-col', isStacked && 'overflow-visible h-auto')}>
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              {isStacked ? (
                <div className="p-6 space-y-10 pb-10">
                  <InvestigationFields
                    form={form}
                    teamFields={teamFields}
                    taskFields={taskFields}
                    personnel={personnel}
                    removeTeamMember={removeTeamMember}
                    removeTask={removeTask}
                    appendTeamMember={appendTeamMember}
                    appendTask={appendTask}
                    handleUserSelection={handleUserSelection}
                    addTaskUpdate={addTaskUpdate}
                    report={report}
                    addEvidencePhoto={addEvidencePhoto}
                    removeEvidencePhoto={removeEvidencePhoto}
                  />
                </div>
              ) : (
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-10 pb-10">
                    <InvestigationFields
                      form={form}
                      teamFields={teamFields}
                      taskFields={taskFields}
                      personnel={personnel}
                      removeTeamMember={removeTeamMember}
                      removeTask={removeTask}
                      appendTeamMember={appendTeamMember}
                      appendTask={appendTask}
                      handleUserSelection={handleUserSelection}
                      addTaskUpdate={addTaskUpdate}
                      report={report}
                      addEvidencePhoto={addEvidencePhoto}
                      removeEvidencePhoto={removeEvidencePhoto}
                    />
                  </div>
                </ScrollArea>
              )}
              {!isStacked && (
                <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
                  <Button type="submit" className="font-black uppercase text-xs h-10 px-8 shadow-md">
                    <Save className="mr-2 h-4 w-4" /> Save Investigation Details
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </FormProvider>
      </div>
    </div>
  );
}

function InvestigationFields({
  form,
  teamFields,
  taskFields,
  personnel,
  removeTeamMember,
  removeTask,
  appendTeamMember,
  appendTask,
  handleUserSelection,
  addTaskUpdate,
  report,
  addEvidencePhoto,
  removeEvidencePhoto,
}: {
  form: UseFormReturn<FormValues>;
  teamFields: Array<{ id: string }>;
  taskFields: Array<{ id: string }>;
  personnel: Personnel[];
  removeTeamMember: (index: number) => void;
  removeTask: (index: number) => void;
  appendTeamMember: (value: FormValues['investigationTeam'][number]) => void;
  appendTask: (value: FormValues['investigationTasks'][number]) => void;
  handleUserSelection: (index: number, userId: string) => void;
  addTaskUpdate: (taskIndex: number, message: string) => Promise<boolean>;
  report: SafetyReport;
  addEvidencePhoto: (photo: { name: string; url: string; uploadDate: string }) => Promise<void>;
  removeEvidencePhoto: (photoId: string) => Promise<void>;
}) {
  return (
    <>
      <section>
        <div className="flex justify-between items-center mb-4">
          <SectionHeader title="Investigation Team" icon={Users} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendTeamMember({ userId: '', name: '', role: 'Team Member' })}
            className="h-7 px-3 text-[10px] font-black uppercase border-slate-300 no-print"
          >
            <PlusCircle className="mr-1 h-3 w-3" /> Add Member
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamFields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/10">
              <FormField
                control={form.control}
                name={`investigationTeam.${index}.userId`}
                render={({ field: memberField }) => (
                  <FormItem className="flex-1">
                    <Label>Team Member</Label>
                    <Select onValueChange={(value) => handleUserSelection(index, value)} defaultValue={memberField.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personnel.map((person) => (
                          <SelectItem key={person.id} value={person.id} className="text-xs">
                            {person.firstName} {person.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`investigationTeam.${index}.role`}
                render={({ field: roleField }) => (
                  <FormItem className="flex-1">
                    <Label>Role</Label>
                    <Select onValueChange={roleField.onChange} defaultValue={roleField.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Lead Investigator', 'Team Member', 'Technical Expert', 'Observer'].map((role) => (
                          <SelectItem key={role} value={role} className="text-xs">
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTeamMember(index)}
                className="h-8 w-8 text-destructive no-print hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <LocalSeparator />

      <section>
        <div className="flex justify-between items-center mb-4">
          <SectionHeader title="Investigation Tasks" icon={CheckCircle2} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendTask({ id: uuidv4(), description: '', assigneeId: '', dueDate: new Date(), status: 'Open', updates: [] })}
            className="h-7 px-3 text-[10px] font-black uppercase border-slate-300 no-print"
          >
            <PlusCircle className="mr-1 h-3 w-3" /> Add Task
          </Button>
        </div>
        <div className="space-y-4">
          {taskFields.map((field, index) => (
            <TaskCard
              key={field.id}
              form={form}
              index={index}
              personnel={personnel}
              removeTask={removeTask}
              addTaskUpdate={addTaskUpdate}
            />
          ))}
        </div>
      </section>

      <LocalSeparator />

      <section>
        <div className="flex justify-between items-center mb-4">
          <SectionHeader title="Investigation Evidence Photos" icon={Camera} />
          <DocumentUploader
            defaultFileName={`investigation-evidence-${report.reportNumber}`}
            restrictedMode="file"
            trigger={(open) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => open('file')}
                className="h-7 px-3 text-[10px] font-black uppercase border-slate-300 no-print"
              >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Photo
              </Button>
            )}
            onDocumentUploaded={async (document) => {
              await addEvidencePhoto({
                name: document.name,
                url: document.url,
                uploadDate: document.uploadDate,
              });
            }}
          />
        </div>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Add scene photos, damage photos, screenshots, or other visual evidence for the investigation.</p>
          {report.investigationEvidencePhotos && report.investigationEvidencePhotos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.investigationEvidencePhotos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-lg border bg-background">
                  <img src={photo.url} alt={photo.name} className="h-36 w-full object-cover" />
                  <div className="space-y-2 border-t px-3 py-3">
                    <p className="truncate text-xs font-semibold text-foreground">{photo.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Uploaded {format(new Date(photo.uploadDate), 'dd MMM yyyy')}
                    </p>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10"
                        onClick={() => void removeEvidencePhoto(photo.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
              No investigation photos uploaded yet.
            </div>
          )}
        </div>
      </section>

      <LocalSeparator />

      <section>
        <FormField
          control={form.control}
          name="investigationNotes"
          render={({ field }) => (
            <FormItem>
              <SectionHeader title="Investigation Summary & Root Cause" icon={AlertTriangle} />
              <FormControl>
                <Textarea
                  placeholder="Summarize the final investigation findings..."
                  className="min-h-48 text-sm font-medium p-4 bg-muted/10 border-slate-200"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </section>
    </>
  );
}

function TaskCard({
  form,
  index,
  personnel,
  removeTask,
  addTaskUpdate,
}: {
  form: UseFormReturn<FormValues>;
  index: number;
  personnel: Personnel[];
  removeTask: (index: number) => void;
  addTaskUpdate: (taskIndex: number, message: string) => Promise<boolean>;
}) {
  const [updateDraft, setUpdateDraft] = React.useState('');
  const [isSavingUpdate, setIsSavingUpdate] = React.useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
  const updateTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const updates = form.watch(`investigationTasks.${index}.updates`) || [];

  const resizeUpdateTextarea = React.useCallback(() => {
    const element = updateTextareaRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(element.scrollHeight, 40)}px`;
  }, []);

  React.useEffect(() => {
    resizeUpdateTextarea();
  }, [updateDraft, resizeUpdateTextarea]);

  const handleSaveUpdate = async () => {
    setIsSavingUpdate(true);
    try {
      const saved = await addTaskUpdate(index, updateDraft);
      if (saved) {
        setUpdateDraft('');
      }
    } finally {
      setIsSavingUpdate(false);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/10 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <FormField
          control={form.control}
          name={`investigationTasks.${index}.description`}
          render={({ field }) => (
            <FormItem className="md:col-span-5">
              <Label>Task Detail</Label>
              <FormControl>
                <Input placeholder="..." {...field} className="h-9 text-xs bg-background font-bold border-slate-300" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`investigationTasks.${index}.assigneeId`}
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <Label>Assignee</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {personnel.map((person) => (
                    <SelectItem key={person.id} value={person.id} className="text-xs">
                      {person.firstName} {person.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`investigationTasks.${index}.dueDate`}
          render={({ field }) => (
            <FormItem className="md:col-span-2 flex flex-col">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'h-9 pl-3 text-left font-bold bg-background text-xs border-slate-300',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'dd MMM') : <span>Date</span>}
                      <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`investigationTasks.${index}.status`}
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <Label>Status</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {['Open', 'In Progress', 'Completed'].map((status) => (
                    <SelectItem key={status} value={status} className="text-xs">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeTask(index)}
          className="md:col-span-1 text-destructive h-8 w-8 no-print hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border bg-background overflow-hidden">
        <button
          type="button"
          onClick={() => setIsFeedbackOpen((current) => !current)}
          className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/10 transition-colors"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isFeedbackOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Task Feedback</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground pl-6">
              {updates.length > 0
                ? `${updates.length} saved update${updates.length === 1 ? '' : 's'} on this task.`
                : 'No feedback captured yet for this task.'}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-black uppercase shrink-0">
            {updates.length} update{updates.length === 1 ? '' : 's'}
          </Badge>
        </button>

        {isFeedbackOpen ? (
          <div className="border-t p-4 space-y-4">
            {updates.length > 0 ? (
              <div className="space-y-3">
                {[...updates]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((update) => (
                    <div key={update.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-foreground">{update.userName}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          {format(new Date(update.timestamp), 'dd MMM HH:mm')}
                        </span>
                        {update.taskStatus ? (
                          <Badge variant="secondary" className="text-[10px] font-black uppercase">
                            {update.taskStatus}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground whitespace-pre-wrap">{update.message}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
                No feedback yet for this task.
              </div>
            )}

            <div className="space-y-3">
              <Textarea
                ref={updateTextareaRef}
                value={updateDraft}
                onChange={(event) => setUpdateDraft(event.target.value)}
                placeholder="Add task feedback, completion notes, or blocker details..."
                rows={1}
                className="min-h-0 h-10 resize-none overflow-hidden bg-background border-slate-300 text-sm font-medium"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={isSavingUpdate || !updateDraft.trim()}
                  onClick={() => void handleSaveUpdate()}
                  className="h-9 px-4 text-[10px] font-black uppercase"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Task Feedback
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
