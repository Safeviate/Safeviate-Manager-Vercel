'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, parse } from 'date-fns';
import { ArrowLeft, CheckCircle2, Mail, Pencil } from 'lucide-react';
import { MainPageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { MeetingRecordData } from '@/types/meeting';

type PersonnelLite = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

const parseLocalDate = (value: string) => {
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
};

const getPersonName = (person?: PersonnelLite) => {
  if (!person) return 'Unassigned';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email || person.id;
};

export default function MeetingDetailPage() {
  const params = useParams<{ meetingId: string }>();
  const meetingId = Array.isArray(params?.meetingId) ? params.meetingId[0] : params?.meetingId;
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<MeetingRecordData[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const invitees = useMemo(() => {
    if (!meeting) return [];
    return meeting.inviteeIds
      .map((id) => personnel.find((person) => person.id === id))
      .filter((person): person is PersonnelLite => Boolean(person));
  }, [meeting, personnel]);

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
    if (!meeting) return;
    try {
      await updateMeeting(meeting, 'sendAgenda');
      toast({ title: 'Agenda Sent', description: `Agenda for ${meeting.title} has been sent.` });
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Send Failed', description: error instanceof Error ? error.message : 'Could not send agenda.' });
    }
  };

  const handleSendMinutes = async () => {
    if (!meeting) return;
    try {
      await updateMeeting(meeting, 'sendMinutes');
      toast({ title: 'Minutes Sent', description: `Minutes for ${meeting.title} have been sent.` });
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Send Failed', description: error instanceof Error ? error.message : 'Could not send minutes.' });
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

  if (!meeting) {
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
          title={meeting.title || meeting.meetingNumber}
          description={`${meeting.meetingNumber} · ${format(parseLocalDate(meeting.meetingDate), 'dd MMM yyyy')} · ${meeting.startTime} - ${meeting.endTime}`}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="font-black uppercase text-xs">
                <Link href="/operations/meetings">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button asChild variant="outline" className="font-black uppercase text-xs">
                <Link href={`/operations/meetings?meetingId=${encodeURIComponent(meeting.id)}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit in Repository
                </Link>
              </Button>
              <Button
                variant="outline"
                className="font-black uppercase text-xs"
                disabled={meeting.inviteeIds.length === 0}
                onClick={() => void handleSendAgenda()}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Agenda
              </Button>
              <Button
                className="font-black uppercase text-xs"
                disabled={meeting.status !== 'Completed' || meeting.inviteeIds.length === 0}
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
              <p className="mt-1 text-sm font-semibold">{meeting.meetingType}</p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Status</p>
              <p className="mt-1 text-sm font-semibold">{meeting.status}</p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Location</p>
              <p className="mt-1 text-sm font-semibold">{meeting.location}</p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Invitees</p>
              <p className="mt-1 text-sm font-semibold">{invitees.length}</p>
            </div>
          </div>

          {meeting.description ? (
            <div className="rounded-lg border bg-background px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{meeting.description}</p>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden border shadow-none">
              <CardHeader className="border-b bg-muted/20 px-4 py-3">
                <p className="text-sm font-black uppercase tracking-tight">Agenda</p>
              </CardHeader>
              <CardContent className="space-y-3 px-4 py-4">
                {meeting.agendaItems.map((item, index) => (
                  <div key={item.id} className="rounded-lg border bg-background px-3 py-3">
                    <p className="text-sm font-semibold">{index + 1}. {item.title || 'Untitled item'}</p>
                    {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border shadow-none">
              <CardHeader className="border-b bg-muted/20 px-4 py-3">
                <p className="text-sm font-black uppercase tracking-tight">Minutes</p>
              </CardHeader>
              <CardContent className="space-y-3 px-4 py-4">
                <div className="rounded-lg border bg-background px-3 py-3 whitespace-pre-wrap text-sm">
                  {meeting.minutes || 'Minutes have not been captured yet.'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border shadow-none">
            <CardHeader className="border-b bg-muted/20 px-4 py-3">
              <p className="text-sm font-black uppercase tracking-tight">Action Items</p>
            </CardHeader>
            <CardContent className="space-y-2 px-4 py-4">
              {meeting.actionItems.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-lg border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {getPersonName(personnel.find((person) => person.id === item.assigneeId))} · Due {format(parseLocalDate(item.dueDate), 'dd MMM yy')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase">
                    {item.status}
                  </Badge>
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
