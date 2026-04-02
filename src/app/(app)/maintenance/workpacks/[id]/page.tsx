'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { ChevronLeft, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Workpack, TaskCard } from '@/types/workpack';
import { TaskCardDialog } from './task-card-dialog';
import { TaskCardItem } from './task-card-item';

export default function WorkpackDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  
  // Workpack Document Reference
  const wpRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/workpacks/${resolvedParams.id}`) : null),
    [firestore, tenantId, resolvedParams.id]
  );
  const { data: workpack, isLoading: isLoadingWp } = useDoc<Workpack>(wpRef);

  // Task Cards Subcollection Reference
  const tcQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(
      collection(firestore, `tenants/${tenantId}/workpacks/${resolvedParams.id}/taskCards`),
      orderBy('createdAt', 'asc')
    ) : null),
    [firestore, tenantId, resolvedParams.id]
  );
  const { data: taskCards, isLoading: isLoadingTc } = useCollection<TaskCard>(tcQuery);

  if (isLoadingWp || isLoadingTc) {
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

      {/* CRS Banner — uses theme tokens so it responds to Page Format branding */}
      {workpack.status !== 'CLOSED' && taskCards && taskCards.length > 0 && taskCards.every(tc => tc.isCompleted && (!tc.requiresInspector || tc.isInspected)) && (
        <Card className="shrink-0 bg-primary/10 border-primary/30 shadow-sm">
           <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-foreground uppercase">Ready for Certificate of Release to Service (CRS)</h3>
                <p className="text-sm text-muted-foreground">All task cards are certified. This workpack is ready for final release.</p>
              </div>
              <Button 
                className="font-black uppercase shadow-md"
                onClick={async () => {
                  if (!firestore || !tenantId || !wpRef) return;
                  await updateDoc(wpRef, { status: 'CLOSED', closedAt: new Date().toISOString() });
                }}
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
