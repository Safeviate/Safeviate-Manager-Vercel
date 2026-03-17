'use client';

import { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, StopCircle, PlusCircle, History, Clock, User, Flag, ShieldAlert } from 'lucide-react';
import type { ERPEvent, ERPLogEntry, ERPEventStatus } from '@/types/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';

interface DiaryTabProps {
  tenantId: string;
}

export function DiaryTab({ tenantId }: DiaryTabProps) {
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);

  const eventsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/erp-events`), orderBy('startedAt', 'desc')) : null),
    [firestore, tenantId]
  );
  const { data: events, isLoading } = useCollection<ERPEvent>(eventsQuery);

  const activeEvent = useMemo(() => events?.find(e => e.status !== 'Closed'), [events]);

  const handleStartERP = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isMock = formData.get('isMock') === 'on';
    
    const newEvent = {
      title: formData.get('title') as string,
      status: isMock ? 'Mock' : 'Active' as ERPEventStatus,
      startedAt: new Date().toISOString(),
      log: [{
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        description: `ERP ${isMock ? 'Mock Exercise' : 'Response'} Initialized: ${formData.get('title')}`,
        loggedBy: userProfile?.id || 'System',
        userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'System',
        isMilestone: true
      }]
    };

    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/erp-events`), newEvent);
    setIsStartOpen(false);
    toast({ title: isMock ? 'Mock Started' : 'ERP ACTIVATED', variant: isMock ? 'default' : 'destructive' });
  };

  const handleAddLog = () => {
    if (!newLogEntry.trim() || !activeEvent || !firestore) return;

    const entry: ERPLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      description: newLogEntry.trim(),
      loggedBy: userProfile?.id || 'Unknown',
      userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Unknown',
      isMilestone: isMilestone
    };

    const eventRef = doc(firestore, `tenants/${tenantId}/erp-events`, activeEvent.id);
    updateDocumentNonBlocking(eventRef, {
      log: arrayUnion(entry)
    });

    setNewLogEntry('');
    setIsMilestone(false);
    toast({ title: 'Logged' });
  };

  const handleCloseERP = () => {
    if (!activeEvent || !firestore) return;
    if (!window.confirm("Are you sure you want to close this ERP session?")) return;

    const eventRef = doc(firestore, `tenants/${tenantId}/erp-events`, activeEvent.id);
    updateDocumentNonBlocking(eventRef, {
      status: 'Closed',
      endedAt: new Date().toISOString()
    });
    toast({ title: 'Session Closed' });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {activeEvent ? (
            <span className="flex items-center gap-2 text-red-600 animate-pulse">
              <ShieldAlert className="h-5 w-5" /> Active Session
            </span>
          ) : 'Response History'}
        </h2>
        {!activeEvent ? (
          <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="animate-bounce shadow-lg"><Play className="mr-2 h-4 w-4" /> Start ERP Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Activate Emergency Response</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleStartERP} className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Session Title</Label><Input name="title" placeholder="e.g., ZS-ABC Overdue - Mock Exercise" required /></div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/10">
                  <Switch name="isMock" id="mock-mode" defaultChecked={true} />
                  <Label htmlFor="mock-mode">Simulation / Mock Exercise</Label>
                </div>
                <p className="text-xs text-muted-foreground italic">Running a simulation will mark all log entries as "Mock".</p>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" variant="destructive">Activate Protocol</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button variant="outline" size="sm" onClick={handleCloseERP}><StopCircle className="mr-2 h-4 w-4" /> Close Session</Button>
        )}
      </div>

      {activeEvent ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 flex-1 min-h-0">
          <Card className="flex flex-col h-full overflow-hidden shadow-none border border-red-200">
            <CardHeader className="bg-red-50/50 border-b">
              <CardTitle className="flex items-center justify-between">
                <span>{activeEvent.title}</span>
                <Badge variant={activeEvent.status === 'Active' ? 'destructive' : 'secondary'}>{activeEvent.status}</Badge>
              </CardTitle>
              <CardDescription>Started: {format(new Date(activeEvent.startedAt), 'PPP p')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {activeEvent.log.map((entry) => (
                    <div key={entry.id} className={cn("flex gap-4 p-3 rounded-lg border", entry.isMilestone ? "bg-primary/5 border-primary/20" : "bg-muted/5")}>
                      <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold font-mono">{format(new Date(entry.timestamp), 'HH:mm:ss')}</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className={cn("text-sm", entry.isMilestone && "font-bold text-primary")}>{entry.description}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                          <User className="h-2.5 w-2.5" /> {entry.userName}
                          {entry.isMilestone && <Badge variant="secondary" className="h-4 text-[8px] bg-primary/10 text-primary border-none"><Flag className="h-2 w-2 mr-1" /> Milestone</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4 bg-muted/10 gap-3">
              <div className="flex-1 space-y-3">
                <Textarea 
                  placeholder="Log an event or communication..." 
                  value={newLogEntry}
                  onChange={(e) => setNewLogEntry(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={isMilestone} onCheckedChange={setIsMilestone} id="milestone-sw" />
                    <Label htmlFor="milestone-sw" className="text-xs">Mark as Milestone</Label>
                  </div>
                  <Button onClick={handleAddLog} disabled={!newLogEntry.trim()}><PlusCircle className="mr-2 h-4 w-4" /> Log Event</Button>
                </div>
              </div>
            </CardFooter>
          </Card>

          <Card className="shadow-none border h-fit sticky top-0">
            <CardHeader className="bg-muted/10">
              <CardTitle className="text-sm">ERP Quick Reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-medium leading-relaxed">
                <p className="font-bold text-emerald-800 mb-1">Standard Announcement:</p>
                "Safeviate Flight Center is responding to a reported incident. Our emergency team has been activated. No further details are confirmed at this time."
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Critical Reminders</p>
                <ul className="text-xs space-y-2 list-disc pl-4">
                  <li>Direct all media inquiries to the Media Officer.</li>
                  <li>Do not speculate on aircraft or personnel identity.</li>
                  <li>Ensure all actions are timestamped in this diary.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="shadow-none border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Past Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {(events || []).filter(e => e.status === 'Closed').map(event => (
                <div key={event.id} className="p-4 border rounded-lg hover:bg-muted/10 transition-colors flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="font-bold">{event.title}</p>
                    <p className="text-xs text-muted-foreground">Started: {format(new Date(event.startedAt), 'PPP p')}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">View Log</Button>
                </div>
              ))}
              {(!events || events.filter(e => e.status === 'Closed').length === 0) && (
                <p className="text-center text-muted-foreground italic py-10">No archived sessions.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}