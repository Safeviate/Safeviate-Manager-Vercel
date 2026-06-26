'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { MessageSquare, Send, UserPlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { ReportDiscussionItem, SafetyReport } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ReportForumProps {
  report: SafetyReport;
  tenantId: string;
  onReportSaved?: (updatedReport: SafetyReport) => void;
}

type TimelineEntry = {
  id: string;
  userName: string;
  userId: string;
  message: string;
  timestamp: string;
  entryType: NonNullable<ReportDiscussionItem['entryType']>;
  assignedToName?: string;
  dueDate?: string;
  taskStatus?: string;
  linkedTaskId?: string;
  linkedTaskDescription?: string;
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};

export function ReportForum({ report, tenantId, onReportSaved }: ReportForumProps) {
  const [newMessage, setNewMessage] = useState('');
  const [entryType, setEntryType] = useState<NonNullable<ReportDiscussionItem['entryType']>>('comment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  const { userProfile } = useUserProfile();
  const { toast } = useToast();

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const response = await fetch('/api/personnel', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!cancelled) {
        setPersonnel(payload?.personnel ?? []);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const timelineEntries = useMemo(() => {
    const discussionEntries: TimelineEntry[] = (report.discussion || [])
      .filter((item) => item.entryType !== 'task_update')
      .map((item) => ({
        id: item.id,
        userName: item.userName,
        userId: item.userId,
        message: item.message,
        timestamp: item.timestamp,
        entryType: item.entryType || 'comment',
        assignedToName: item.assignedToName,
        dueDate: item.dueDate,
        taskStatus: item.taskStatus,
        linkedTaskId: item.linkedTaskId,
      }));

    const taskEntries: TimelineEntry[] = (report.investigationTasks || []).flatMap((task) =>
      (task.updates || []).map((update) => ({
        id: update.id,
        userName: update.userName,
        userId: update.userId,
        message: update.message,
        timestamp: update.timestamp,
        entryType: 'task_update',
        taskStatus: update.taskStatus,
        linkedTaskId: task.id,
        linkedTaskDescription: task.description,
      }))
    );

    return [...discussionEntries, ...taskEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [report.discussion, report.investigationTasks]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userProfile) return;

    setIsSubmitting(true);

    const messageItem: ReportDiscussionItem = {
      id: uuidv4(),
      userId: userProfile.id,
      userName: `${userProfile.firstName} ${userProfile.lastName}`,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      entryType,
    };

    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: {
            ...report,
            discussion: [...(report.discussion || []), messageItem],
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to post this diary entry right now.');
      }

      const payload = await response.json().catch(() => null);
      onReportSaved?.((payload?.report as SafetyReport | undefined) ?? {
        ...report,
        discussion: [...(report.discussion || []), messageItem],
      });

      setNewMessage('');
      setEntryType('comment');
      toast({ title: 'Diary entry posted' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Post failed',
        description: error instanceof Error ? error.message : 'Unable to post this diary entry right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b bg-muted/5 p-4 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Case Diary</h3>
          <p className="text-xs font-medium text-muted-foreground">Capture comments, findings, decisions, and review the case timeline here. Task work and feedback are managed in Investigation.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-0 overflow-hidden bg-muted/5">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {timelineEntries.length > 0 ? (
              timelineEntries.map((entry) => {
                const isMe = entry.userId === userProfile?.id;
                return (
                  <div key={entry.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 shrink-0 border">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${entry.userName}`} />
                      <AvatarFallback>{entry.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col flex-1 ${isMe ? 'items-end' : ''}`}>
                      <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-black uppercase tracking-tight">{entry.userName}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{format(new Date(entry.timestamp), 'dd MMM HH:mm')}</span>
                      </div>
                      <div className="w-full rounded-xl border border-slate-200 bg-background p-4 text-sm shadow-none space-y-3 font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-black uppercase border-slate-300 bg-white text-slate-700">
                            {entry.entryType === 'task_assignment'
                              ? 'Task Assigned'
                              : entry.entryType === 'task_update'
                                ? 'Task Feedback'
                                : entry.entryType === 'status_change'
                                  ? 'Status Change'
                                : entry.entryType === 'finding'
                                  ? 'Finding'
                                  : entry.entryType === 'decision'
                                    ? 'Decision'
                                    : 'Comment'}
                          </Badge>
                          {entry.taskStatus ? (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] font-black uppercase',
                                entry.taskStatus === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-100'
                                  : entry.taskStatus === 'In Progress'
                                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-100'
                                    : 'bg-slate-100 text-slate-800 hover:bg-slate-100'
                              )}
                            >
                              {entry.taskStatus}
                            </Badge>
                          ) : null}
                        </div>
                        {entry.assignedToName ? (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit border border-slate-300 bg-white text-[10px] font-black uppercase text-slate-700">
                            <UserPlus className="h-3 w-3" />
                            Assigned: {entry.assignedToName}
                          </Badge>
                        ) : null}
                        {entry.dueDate ? (
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Due {format(parseLocalDate(entry.dueDate), 'dd MMM yyyy')}
                          </p>
                        ) : null}
                        {entry.linkedTaskDescription ? (
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Task: {entry.linkedTaskDescription}
                          </p>
                        ) : null}
                        <p className="leading-relaxed text-slate-900 whitespace-pre-wrap">{entry.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                <MessageSquare className="h-12 w-12 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">No Diary Entries Yet</p>
                <p className="text-xs font-medium">Add a case note, finding, or decision to start the record.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="shrink-0 border-t p-6 bg-background flex flex-col gap-4">
        <div className="flex gap-3 items-start">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest whitespace-nowrap">Entry Type:</span>
                <Select value={entryType} onValueChange={(value) => setEntryType(value as NonNullable<ReportDiscussionItem['entryType']>)}>
                  <SelectTrigger className="h-8 w-[180px] text-[10px] font-black uppercase bg-background border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comment" className="text-[10px] font-black uppercase">Comment</SelectItem>
                    <SelectItem value="finding" className="text-[10px] font-black uppercase">Finding</SelectItem>
                    <SelectItem value="decision" className="text-[10px] font-black uppercase">Decision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              placeholder={
                entryType === 'finding'
                  ? 'Record an investigation finding...'
                  : entryType === 'decision'
                    ? 'Record a management decision...'
                    : 'Write a comment or case note...'
              }
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              className="min-h-[80px] bg-muted/5 border-slate-300 font-medium text-sm focus-visible:ring-primary"
            />
          </div>
          <Button
            disabled={!newMessage.trim() || isSubmitting}
            onClick={handleSendMessage}
            className="h-20 w-20 rounded-xl bg-emerald-700 hover:bg-emerald-800 shadow-md flex flex-col gap-1 shrink-0"
          >
            <Send className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase">Post</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
