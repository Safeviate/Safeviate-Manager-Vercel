'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainPageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { AttendanceRecordData, AttendanceSummary } from '@/types/attendance';
import type { Personnel, PilotProfile } from '../personnel/page';

export default function AttendancePage() {
  const { toast } = useToast();
  const { tenantId, userProfile } = useUserProfile();
  const [personnel, setPersonnel] = useState<(Personnel | PilotProfile)[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [location, setLocation] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('15');
  const [now, setNow] = useState(Date.now());

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attendanceResponse, usersResponse] = await Promise.all([
        fetch('/api/attendance', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ]);
      const attendancePayload = await attendanceResponse.json().catch(() => ({ attendance: [] }));
      const usersPayload = await usersResponse.json().catch(() => ({ users: [], personnel: [] }));
      const attendanceRows = Array.isArray(attendancePayload.attendance) ? attendancePayload.attendance : [];
      setAttendance(attendanceRows as AttendanceRecordData[]);
      setPersonnel((usersPayload?.users ?? usersPayload?.personnel ?? []) as (Personnel | PilotProfile)[]);
      const currentId = (userProfile as { id?: string; email?: string } | null)?.id;
      const currentEmail = (userProfile as { email?: string } | null)?.email?.toLowerCase();
      const matchingPerson = currentEmail
        ? (usersPayload?.users ?? usersPayload?.personnel ?? []).find((person: { email?: string }) => (person.email || '').toLowerCase() === currentEmail)
        : null;
      if (!selectedPersonnelId && matchingPerson?.id) {
        setSelectedPersonnelId(matchingPerson.id);
      } else if (!selectedPersonnelId && currentId) {
        setSelectedPersonnelId(currentId);
      }
    } catch {
      setAttendance([]);
      setPersonnel([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    window.addEventListener('safeviate-personnel-updated', loadData);
    window.addEventListener('safeviate-attendance-updated', loadData);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.removeEventListener('safeviate-personnel-updated', loadData);
      window.removeEventListener('safeviate-attendance-updated', loadData);
      window.clearInterval(timer);
    };
  }, []);

  const activeSessions = useMemo(() => attendance.filter((row) => row.status === 'clocked_in' && !row.clockOut), [attendance]);
  const calcBreakMinutes = (record: AttendanceRecordData) => (record.breaks || []).reduce((sum, breakItem) => {
    if (typeof breakItem.minutes === 'number') return sum + Math.max(0, breakItem.minutes);
    if (breakItem.start && breakItem.end) {
      const start = new Date(breakItem.start).getTime();
      const end = new Date(breakItem.end).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        return sum + Math.max(0, Math.round((end - start) / 60000));
      }
    }
    return sum;
  }, 0);
  const calcDutyMinutes = (record: AttendanceRecordData, referenceNow = Date.now()) => {
    if (!record.clockIn) return 0;
    const start = new Date(record.clockIn).getTime();
    const end = record.clockOut ? new Date(record.clockOut).getTime() : referenceNow;
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
    return Math.max(0, Math.round((end - start) / 60000));
  };
  const calcNetDutyMinutes = (record: AttendanceRecordData, referenceNow = Date.now()) => Math.max(0, calcDutyMinutes(record, referenceNow) - calcBreakMinutes(record));
  const summary: AttendanceSummary = useMemo(() => ({
    dutyRecords: attendance,
    clockedInCount: activeSessions.length,
    openSessions: activeSessions.length,
    totalDutyMinutes: attendance.reduce((sum, record) => {
      return sum + calcNetDutyMinutes(record, now);
    }, 0),
    totalDutyHours: 0,
  }), [attendance, activeSessions.length, now]);
  summary.totalDutyHours = parseFloat((summary.totalDutyMinutes / 60).toFixed(1));

  const currentUserAttendance = useMemo(
    () => activeSessions.find((row) => row.personnelId === selectedPersonnelId) || null,
    [activeSessions, selectedPersonnelId]
  );
  const currentUserTotalBreakMinutes = currentUserAttendance ? calcBreakMinutes(currentUserAttendance) : 0;
  const currentUserDutyMinutes = currentUserAttendance ? calcDutyMinutes(currentUserAttendance, now) : 0;
  const currentUserNetDutyMinutes = currentUserAttendance ? calcNetDutyMinutes(currentUserAttendance, now) : 0;

  const saveAttendance = async (attendanceRecord: Partial<AttendanceRecordData> & { personnelId: string; status: 'clocked_in' | 'clocked_out' }) => {
    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendance: attendanceRecord }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to save attendance.');
    }
  };

  const handleClockIn = async () => {
    if (!selectedPersonnelId) {
      toast({ variant: 'destructive', title: 'Select a person', description: 'Choose the person clocking in first.' });
      return;
    }
    const selectedPerson = personnel.find((p) => p.id === selectedPersonnelId);
    try {
      await saveAttendance({
        personnelId: selectedPersonnelId,
        personnelName: selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}`.trim() : selectedPersonnelId,
        clockIn: new Date().toISOString(),
        status: 'clocked_in',
        location: location || undefined,
        breaks: [],
      });
      window.dispatchEvent(new Event('safeviate-attendance-updated'));
      toast({ title: 'Clocked in' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Clock in failed', description: error instanceof Error ? error.message : 'Unable to clock in.' });
    }
  };

  const handleClockOut = async () => {
    if (!currentUserAttendance) return;
    try {
      await saveAttendance({
        ...currentUserAttendance,
        status: 'clocked_out',
        clockOut: new Date().toISOString(),
      });
      window.dispatchEvent(new Event('safeviate-attendance-updated'));
      toast({ title: 'Clocked out' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Clock out failed', description: error instanceof Error ? error.message : 'Unable to clock out.' });
    }
  };

  const handleAddBreak = async () => {
    if (!currentUserAttendance) {
      toast({ variant: 'destructive', title: 'No active session', description: 'Clock in first before adding a break.' });
      return;
    }
    const minutes = parseInt(breakMinutes, 10);
    if (Number.isNaN(minutes) || minutes <= 0) {
      toast({ variant: 'destructive', title: 'Invalid break', description: 'Enter a positive break duration in minutes.' });
      return;
    }
    try {
      const nextBreaks = [...(currentUserAttendance.breaks || []), {
        start: new Date().toISOString(),
        end: new Date(Date.now() + minutes * 60_000).toISOString(),
        minutes,
      }];
      await saveAttendance({
        ...currentUserAttendance,
        breaks: nextBreaks,
        status: 'clocked_in',
      });
      window.dispatchEvent(new Event('safeviate-attendance-updated'));
      toast({ title: 'Break added', description: `${minutes} minute break recorded.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Break save failed', description: error instanceof Error ? error.message : 'Unable to save break.' });
    }
  };

  return (
    <div className="lg:max-w-[1100px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader
          title="Time & Attendance"
          description="Clock in and out here for duty time. Flight time still comes from bookings."
        />
        <CardContent className="flex-1 overflow-auto p-4 bg-background space-y-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card><CardContent className="p-4"><p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Clocked In</p><p className="mt-2 text-2xl font-black">{summary.clockedInCount}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Duty Hours</p><p className="mt-2 text-2xl font-black">{summary.totalDutyHours.toFixed(1)}h</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Open Sessions</p><p className="mt-2 text-2xl font-black">{summary.openSessions}</p></CardContent></Card>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-black uppercase tracking-widest">Clock In / Out</h2>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black">Person</Label>
                      <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose person" />
                        </SelectTrigger>
                        <SelectContent>
                          {personnel.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {`${person.firstName} ${person.lastName}`.trim() || person.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black">Location</Label>
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Base / site" />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button onClick={handleClockIn} className="gap-2"><LogIn className="h-4 w-4" /> Clock In</Button>
                      <Button onClick={handleClockOut} variant="outline" className="gap-2" disabled={!currentUserAttendance}><LogOut className="h-4 w-4" /> Clock Out</Button>
                    </div>
                  </div>
                  {currentUserAttendance ? (
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black">Break minutes</Label>
                        <Input value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} type="number" min="1" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black">Duty now</Label>
                        <div className="rounded-md border px-3 py-2 text-sm font-black">{Math.max(0, currentUserNetDutyMinutes)} min</div>
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleAddBreak} variant="outline" className="gap-2 w-full"><Clock className="h-4 w-4" /> Add Break</Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Active Attendance</p>
                  <div className="space-y-2">
                    {activeSessions.length > 0 ? activeSessions.map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <p className="font-semibold">{record.personnelName || record.personnelId}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.location || 'No location'} · {Math.max(0, calcNetDutyMinutes(record, now))} min net duty
                          </p>
                        </div>
                        <Badge variant="secondary">Clocked in</Badge>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No active sessions right now.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
