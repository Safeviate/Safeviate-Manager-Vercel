'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, parse } from 'date-fns';
import { ArrowLeft, CheckCircle2, Mail, Pencil, Plus, Save } from 'lucide-react';
import { MainPageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createClientId } from '@/lib/client/create-client-id';
import type { MeetingActionItem, MeetingRecordData } from '@/types/meeting';

type PersonnelLite = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type DiscussionPointDraft = {
  id: string;
  text: string;
  minutes?: string;
};

const parseLocalDate = (value: string) => {
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
};

const getPersonName = (person?: PersonnelLite) => {
  if (!person) return 'Unassigned';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email || person.id;
};

const ACTION_STATUS_OPTIONS: Array<MeetingActionItem['status']> = ['Open', 'In Progress', 'Completed', 'Cancelled'];

const createActionItem = (item?: Partial<MeetingActionItem>): MeetingActionItem => ({
  id: item?.id || createClientId(),
  description: item?.description || '',
  assigneeId: item?.assigneeId || '',
  assigneeName: item?.assigneeName || '',
  dueDate: item?.dueDate || format(new Date(), 'yyyy-MM-dd'),
  status: item?.status || 'Open',
});

const toDateInput = (value?: string | null) => {
  if (!value) return format(new Date(), 'yyyy-MM-dd');
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? format(new Date(), 'yyyy-MM-dd') : format(date, 'yyyy-MM-dd');
};

const createDiscussionPoint = (point?: Partial<DiscussionPointDraft>): DiscussionPointDraft => ({
  id: point?.id || createClientId(),
  text: point?.text || '',
  minutes: point?.minutes || '',
});

export default function MeetingDetailPage() {
  const params = useParams<{ meetingId: string }>();
  const meetingId = Array.isArray(params?.meetingId) ? params.meetingId[0] : params?.meetingId;
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<MeetingRecordData[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draftMeeting, setDraftMeeting] = useState<MeetingRecordData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [meetingsResponse, summaryResponse] = await Promise.all([
          fetch('/api/meetings', { cache: 'no-store' }),
          fetch('/api/dashboard-summary', { cache: 'no-store' }),
        ]);
        const meetingsPayload = await meetingsResponse.json().catch(() => ({ meetings: [] }));
        const summaryPayload = await summaryResponse.json().catch(() => ({ personnel: [] }));
        if (!cancelled) {
          setMeetings(Array.isArray(meetingsPayload.meetings) ? meetingsPayload.meetings : []);
          setPersonnel(Array.isArray(summaryPayload.personnel) ? summaryPayload.personnel : []);
        }
      } catch (error) {
        console.error('[meetings] detail load failed', error);
        if (!cancelled) {
          setMeetings([]);
          setPersonnel([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    window.addEventListener('safeviate-meetings-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('safeviate-meetings-updated', load);
    };
  }, []);

  const meeting = useMemo(() => meetings.find((entry) => entry.id === meetingId) || null, [meetings, meetingId]);

  useEffect(() => {
    setDraftMeeting(meeting);
  }, [meeting]);

  const activeMeeting = draftMeeting || meeting;

  const invitees = useMemo(() => {
    if (!activeMeeting) return [];
    return activeMeeting.inviteeIds
      .map((id) => personnel.find((person) => person.id === id))
      .filter((person): person is PersonnelLite => Boolean(person));
  }, [activeMeeting, personnel]);

  const updateMeeting = async (nextMeeting: MeetingRecordData, action: 'sendAgenda' | 'sendMinutes' | 'save' = 'save') => {
    const response = await fetch('/api/meetings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting: nextMeeting, action }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to update meeting.');
    }
    const payload = await response.json().catch(() => ({}));
    const updated = (payload.meeting || nextMeeting) as MeetingRecordData;
    setMeetings((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    window.dispatchEvent(new Event('safeviate-meetings-updated'));
    return updated;
  };

  const handleSendAgenda = async () => {
    if (!activeMeeting) return;
    try {
      await updateMeeting(activeMeeting, 'sendAgenda');
      toast({ title: 'Agenda Sent', description: `Agenda for ${activeMeeting.title || activeMeeting.meetingNumber} has been sent.` });
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Send Failed', description: error instanceof Error ? error.message : 'Could not send agenda.' });
    }
  };

  const handleSendMinutes = async () => {
    if (!activeMeeting) return;
    try {
      await updateMeeting(activeMeeting, 'sendMinutes');
      toast({ title: 'Minutes Sent', description: `Minutes for ${activeMeeting.title || activeMeeting.meetingNumber} have been sent.` });
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Send Failed', description: error instanceof Error ? error.message : 'Could not send minutes.' });
    }
  };

  const handleSaveMinutes = async () => {
    if (!draftMeeting) return;
    setIsSaving(true);
    try {
      const updated = await updateMeeting(draftMeeting, 'save');
      setDraftMeeting(updated);
      toast({ title: 'Minutes Saved', description: `Minutes for ${updated.title || updated.meetingNumber} have been saved.` });
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error instanceof Error ? error.message : 'Could not save minutes.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto w-full space-y-6 px-1 pt-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  if (!activeMeeting) {
    return (
      <div className="max-w-[1100px] mx-auto w-full space-y-4 px-1 pt-4">
        <MainPageHeader title="Meeting Not Found" />
        <Card className="border shadow-none">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">The meeting you are looking for could not be found.</p>
            <Button asChild className="mt-4 font-black uppercase text-xs">
              <Link href="/operations/meetings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Meetings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto w-full space-y-6 px-1 pt-4">
      <Card className="overflow-hidden border shadow-none">
        <MainPageHeader
          title={activeMeeting.title || activeMeeting.meetingNumber}
          description={`${activeMeeting.meetingNumber} · ${format(parseLocalDate(activeMeeting.meetingDate), 'dd MMM yyyy')} · ${activeMeeting.startTime} - ${activeMeeting.endTime}`}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="font-black uppercase text-xs">
                <Link href="/operations/meetings">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button asChild variant="outline" className="font-black uppercase text-xs">
                <Link href={`/operations/meetings?meetingId=${encodeURIComponent(activeMeeting.id)}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit in Repository
                </Link>
              </Button>
              <Button
                variant="outline"
                className="font-black uppercase text-xs"
                disabled={isSaving}
                onClick={() => void handleSaveMinutes()}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Minutes'}
              </Button>
              <Button
                variant="outline"
                className="font-black uppercase text-xs"
                onClick={() => {
                  setDraftMeeting((current) => {
                    if (!current) return current;
                    return { ...current, actionItems: [...current.actionItems, createActionItem()] };
                  });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Action
              </Button>
              <Button
                variant="outline"
                className="font-black uppercase text-xs"
                disabled={activeMeeting.inviteeIds.length === 0}
                onClick={() => void handleSendAgenda()}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Agenda
              </Button>
              <Button
                className="font-black uppercase text-xs"
                disabled={activeMeeting.status !== 'Completed' || activeMeeting.inviteeIds.length === 0}
                onClick={() => void handleSendMinutes()}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Send Minutes
              </Button>
            </div>
          )}
        />

        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Type</p>
              <p className="mt-1 text-sm font-semibold">{activeMeeting.meetingType}</p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Status</p>
              <p className="mt-1 text-sm font-semibold">{activeMeeting.status}</p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Location</p>
              <p className="mt-1 text-sm font-semibold">{activeMeeting.location}</p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Invitees</p>
              <p className="mt-1 text-sm font-semibold">{invitees.length}</p>
            </div>
          </div>

          {activeMeeting.description ? (
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{activeMeeting.description}</p>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden border shadow-none">
              <CardHeader className="border-b bg-muted/20 px-4 py-3">
                <p className="text-sm font-black uppercase tracking-tight">Agenda</p>
              </CardHeader>
              <CardContent className="space-y-3 px-4 py-4">
                {activeMeeting.agendaItems.map((item, index) => (
                  <div key={item.id} className="rounded-lg border bg-background px-3 py-3">
                    <p className="text-sm font-semibold">{index + 1}. {item.title || 'Untitled item'}</p>
                    {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                    {item.discussionPoints && item.discussionPoints.length > 0 ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Discussion Points</p>
                        <div className="space-y-2">
                          {item.discussionPoints.map((point, pointIndex) => (
                            <div key={`${item.id}-point-${pointIndex}`} className="rounded-md border bg-muted/10 px-3 py-2">
                              <div className="flex gap-2">
                                <span className="font-semibold text-muted-foreground">{pointIndex + 1}.</span>
                                <span className="text-sm font-medium text-foreground">{point.text}</span>
                              </div>
                              <div className="mt-2 pl-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Minutes</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{point.minutes || 'No minutes recorded yet.'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border shadow-none">
              <CardHeader className="border-b bg-muted/20 px-4 py-3">
                <p className="text-sm font-black uppercase tracking-tight">Minutes</p>
              </CardHeader>
              <CardContent className="space-y-3 px-4 py-4">
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Meeting Summary</p>
                  <Textarea
                    value={activeMeeting.minutes || ''}
                    onChange={(event) => {
                      setDraftMeeting((current) => (current ? { ...current, minutes: event.target.value } : current));
                    }}
                    className="mt-2 min-h-[120px]"
                    placeholder="Enter the overall meeting summary"
                  />
                </div>
                <div className="space-y-3">
                  {activeMeeting.agendaItems.map((item, index) => (
                    <div key={`${item.id}-minutes`} className="rounded-lg border bg-background px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{index + 1}. {item.title || 'Untitled item'}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-[10px] font-black uppercase"
                          onClick={() => {
                            setDraftMeeting((current) => {
                              if (!current) return current;
                              return {
                                ...current,
                                agendaItems: current.agendaItems.map((agendaItem) =>
                                  agendaItem.id === item.id
                                    ? {
                                        ...agendaItem,
                                        discussionPoints: [...(agendaItem.discussionPoints || []), createDiscussionPoint()],
                                      }
                                    : agendaItem
                                ),
                              };
                            });
                          }}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add Point
                        </Button>
                      </div>
                      <div className="mt-2 space-y-3">
                        {(item.discussionPoints || []).map((point, pointIndex) => (
                          <div key={point.id} className="rounded-md border bg-muted/10 px-3 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                Discussion Point {pointIndex + 1}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-[10px] font-black uppercase"
                                onClick={() => {
                                  setDraftMeeting((current) => {
                                    if (!current) return current;
                                    return {
                                      ...current,
                                      agendaItems: current.agendaItems.map((agendaItem) => {
                                        if (agendaItem.id !== item.id) return agendaItem;
                                        return {
                                          ...agendaItem,
                                          discussionPoints: (agendaItem.discussionPoints || []).filter((discussionPoint) => discussionPoint.id !== point.id),
                                        };
                                      }),
                                    };
                                  });
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                            <Input
                              value={point.text || ''}
                              onChange={(event) => {
                                setDraftMeeting((current) => {
                                  if (!current) return current;
                                  return {
                                    ...current,
                                    agendaItems: current.agendaItems.map((agendaItem) => {
                                      if (agendaItem.id !== item.id) return agendaItem;
                                      return {
                                        ...agendaItem,
                                        discussionPoints: (agendaItem.discussionPoints || []).map((discussionPoint) =>
                                          discussionPoint.id === point.id
                                            ? { ...discussionPoint, text: event.target.value }
                                            : discussionPoint
                                        ),
                                      };
                                    }),
                                  };
                                });
                              }}
                              className="mt-2"
                              placeholder="Enter the discussion point"
                            />
                            <Textarea
                              value={point.minutes || ''}
                              onChange={(event) => {
                                setDraftMeeting((current) => {
                                  if (!current) return current;
                                  return {
                                    ...current,
                                    agendaItems: current.agendaItems.map((agendaItem) => {
                                      if (agendaItem.id !== item.id) return agendaItem;
                                      return {
                                        ...agendaItem,
                                        discussionPoints: (agendaItem.discussionPoints || []).map((discussionPoint) =>
                                          discussionPoint.id === point.id
                                            ? { ...discussionPoint, minutes: event.target.value }
                                            : discussionPoint
                                        ),
                                      };
                                    }),
                                  };
                                });
                              }}
                              className="mt-2 min-h-[96px]"
                              placeholder="Enter the minutes for this discussion point"
                            />
                          </div>
                        ))}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Decision / Outcome</p>
                          <Input
                            value={item.decision || ''}
                            onChange={(event) => {
                              setDraftMeeting((current) => {
                                if (!current) return current;
                                return {
                                  ...current,
                                  agendaItems: current.agendaItems.map((agendaItem) =>
                                    agendaItem.id === item.id ? { ...agendaItem, decision: event.target.value } : agendaItem
                                  ),
                                };
                              });
                            }}
                            className="mt-2"
                            placeholder="Enter the final decision or outcome"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border shadow-none">
            <CardHeader className="border-b bg-muted/20 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black uppercase tracking-tight">Action Items</p>
                <Badge variant="outline" className="text-[10px] font-black uppercase">
                  {activeMeeting.actionItems.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              {activeMeeting.actionItems.map((item, index) => (
                <div key={item.id} className="rounded-lg border bg-background p-3">
                  <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Action {index + 1}</Label>
                      <Input
                        value={item.description}
                        onChange={(event) => {
                          setDraftMeeting((current) => {
                            if (!current) return current;
                            return {
                              ...current,
                              actionItems: current.actionItems.map((actionItem) =>
                                actionItem.id === item.id ? { ...actionItem, description: event.target.value } : actionItem
                              ),
                            };
                          });
                        }}
                        className="h-11 font-bold"
                        placeholder="Follow-up task"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Assignee</Label>
                      <Select
                        value={item.assigneeId || '__unassigned__'}
                        onValueChange={(value) => {
                          const assignee = value === '__unassigned__' ? undefined : personnel.find((person) => person.id === value);
                          setDraftMeeting((current) => {
                            if (!current) return current;
                            return {
                              ...current,
                              actionItems: current.actionItems.map((actionItem) =>
                                actionItem.id === item.id
                                  ? {
                                      ...actionItem,
                                      assigneeId: value === '__unassigned__' ? '' : value,
                                      assigneeName: assignee ? getPersonName(assignee) : '',
                                    }
                                  : actionItem
                              ),
                            };
                          });
                        }}
                      >
                        <SelectTrigger className="h-11 font-bold">
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unassigned__">Unassigned</SelectItem>
                          {personnel.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {getPersonName(person)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Due</Label>
                      <Input
                        type="date"
                        value={toDateInput(item.dueDate)}
                        onChange={(event) => {
                          setDraftMeeting((current) => {
                            if (!current) return current;
                            return {
                              ...current,
                              actionItems: current.actionItems.map((actionItem) =>
                                actionItem.id === item.id ? { ...actionItem, dueDate: event.target.value } : actionItem
                              ),
                            };
                          });
                        }}
                        className="h-11 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Status</Label>
                      <Select
                        value={item.status}
                        onValueChange={(value) => {
                          setDraftMeeting((current) => {
                            if (!current) return current;
                            return {
                              ...current,
                              actionItems: current.actionItems.map((actionItem) =>
                                actionItem.id === item.id ? { ...actionItem, status: value as MeetingActionItem['status'] } : actionItem
                              ),
                            };
                          });
                        }}
                      >
                        <SelectTrigger className="h-11 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[10px] font-black uppercase"
                        onClick={() => {
                          setDraftMeeting((current) => {
                            if (!current) return current;
                            if (current.actionItems.length === 1) return current;
                            return {
                              ...current,
                              actionItems: current.actionItems.filter((actionItem) => actionItem.id !== item.id),
                            };
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border shadow-none">
            <CardHeader className="border-b bg-muted/20 px-4 py-3">
              <p className="text-sm font-black uppercase tracking-tight">Invitees</p>
            </CardHeader>
            <CardContent className="px-4 py-4">
              <ScrollArea className="max-h-64 pr-3">
                <div className="space-y-2">
                  {invitees.map((person) => (
                    <div key={person.id} className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-sm font-semibold">{getPersonName(person)}</p>
                      <p className="text-xs text-muted-foreground">{person.email || person.id}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
