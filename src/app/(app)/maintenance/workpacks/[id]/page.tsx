'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Workpack, TaskCard } from '@/types/workpack';
import { TaskCardDialog } from './task-card-dialog';
import { TaskCardItem } from './task-card-item';

export default function WorkpackDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { tenantId } = useUserProfile();
  
  const [workpack, setWorkpack] = useState<Workpack | null>(null);
  const [allTaskCards, setAllTaskCards] = useState<TaskCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(() => {
    setIsLoading(true);
    try {
        const storedWps = localStorage.getItem('safeviate.maintenance-workpacks');
        const storedTcs = localStorage.getItem('safeviate.maintenance-task-cards');
        
        if (storedWps) {
            const wps = JSON.parse(storedWps) as Workpack[];
            const found = wps.find(wp => wp.id === resolvedParams.id);
            if (found) setWorkpack(found);
        }
        
        if (storedTcs) {
            setAllTaskCards(JSON.parse(storedTcs));
        }
    } catch (e) {
        console.error("Failed to load workpack data", e);
    } finally {
        setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    loadData();
    window.addEventListener('safeviate-maintenance-workpacks-updated', loadData);
    window.addEventListener('safeviate-maintenance-task-cards-updated', loadData);
    return () => {
        window.removeEventListener('safeviate-maintenance-workpacks-updated', loadData);
        window.removeEventListener('safeviate-maintenance-task-cards-updated', loadData);
    }
  }, [loadData]);

  const taskCards = useMemo(() => {
      return allTaskCards.filter(tc => tc.workpackId === resolvedParams.id);
  }, [allTaskCards, resolvedParams.id]);

  const handleCloseWorkpack = () => {
      if (!workpack) return;
      try {
          const storedWps = localStorage.getItem('safeviate.maintenance-workpacks');
          const wps = storedWps ? JSON.parse(storedWps) as Workpack[] : [];
          const nextWps = wps.map(wp => wp.id === workpack.id ? { ...wp, status: 'CLOSED', closedAt: new Date().toISOString() } : wp);
          localStorage.setItem('safeviate.maintenance-workpacks', JSON.stringify(nextWps));
          window.dispatchEvent(new Event('safeviate-maintenance-workpacks-updated'));
      } catch (e) {
          console.error("Failed to close workpack", e);
      }
  }

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto w-full space-y-6 px-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workpack) {
    return <div className="p-8 text-center text-muted-foreground uppercase font-black">Workpack NOT FOUND</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full p-4 overflow-hidden">
      
      {/* Header Sticky Card */}
      <Card className="shrink-0 bg-background shadow-md border-b-4 border-b-primary sticky top-0 z-10">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" className="shrink-0 rounded-full h-10 w-10" onClick={() => router.push('/maintenance/workpacks')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1">
                Ref: <span className="text-primary">{workpack.trackingNumber}</span>
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{workpack.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge className="bg-slate-100 text-slate-800 text-[9px] uppercase font-bold border-slate-200">
                  A/C: {workpack.aircraftId}
                </Badge>
                <div className="flex items-center text-[10px] text-muted-foreground font-mono">
                  <Clock className="w-3 h-3 mr-1" />
                  {workpack.openedAt ? format(new Date(workpack.openedAt), 'dd MMM yyyy HH:mm') : '-'}
                </div>
              </div>
            </div>
          </div>
          {workpack.status === 'CLOSED' ? (
             <Badge className="h-10 px-6 bg-emerald-600 hover:bg-emerald-600 font-black tracking-widest text-sm uppercase">
               Released to Service
             </Badge>
          ) : (
            <div className="flex gap-2">
              <TaskCardDialog workpackId={workpack.id} tenantId={tenantId || ''} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRS Banner */}
      {workpack.status !== 'CLOSED' && taskCards && taskCards.length > 0 && taskCards.every(tc => tc.isCompleted && (!tc.requiresInspector || tc.isInspected)) && (
        <Card className="shrink-0 bg-primary/10 border-primary/30 shadow-sm">
           <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-foreground uppercase">Ready for Certificate of Release to Service (CRS)</h3>
                <p className="text-sm text-muted-foreground">All task cards are certified. This workpack is ready for final release.</p>
              </div>
              <Button 
                className="font-black uppercase shadow-md"
                onClick={handleCloseWorkpack}
              >
                 Issue CRS & Lock Package
              </Button>
           </CardContent>
        </Card>
      )}

      <ScrollArea className="flex-1 -mx-4 px-4 h-full pb-24">
        {taskCards && taskCards.length > 0 ? (
          <div className="space-y-4">
            {taskCards.map(tc => (
              <TaskCardItem key={tc.id} taskCard={tc} workpackId={workpack.id} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border">
                <CheckCircle className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-bold text-sm uppercase">No Task Cards Attached</p>
                <p className="text-xs">Add cards to begin building this maintenance package.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </ScrollArea>
    </div>
  );
}
