'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PilotProfile } from '../../users/personnel/page';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { MainPageHeader } from '@/components/page-header';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StudentProgressPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const studentsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null,
    [firestore, tenantId]
  );
  
  const { data: students, isLoading: isLoadingStudents, error } = useCollection<PilotProfile>(studentsQuery);

  if (isLoadingStudents) {
    return (
        <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </div>
    );
  }

  if (error) {
      return (
        <div className="max-w-[1400px] mx-auto w-full text-center py-20">
            <p className="text-destructive font-black uppercase tracking-tight">Error: {error.message}</p>
        </div>
      )
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full overflow-hidden pt-2 px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
        <div className="sticky top-0 z-30 bg-card">
            <MainPageHeader 
                title="Student Training Progress"
                description="Monitor flight hour milestones and review instructor debriefs for all students."
            />
        </div>
        
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full no-scrollbar">
            <div className="p-6 pb-20">
                {students && students.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {students.map(student => (
                            <Link key={student.id} href={`/training/student-progress/${student.id}`}>
                                <Card className="group hover:border-emerald-600/30 hover:bg-emerald-50/10 transition-all h-full shadow-none border bg-muted/5 overflow-hidden">
                                    <CardHeader className="flex flex-row items-center gap-4 p-5">
                                        <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.firstName} ${student.lastName}`} />
                                            <AvatarFallback className="font-black text-lg bg-primary/10 text-primary">{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg font-black uppercase tracking-tight group-hover:text-emerald-700 transition-colors">{student.firstName} {student.lastName}</CardTitle>
                                            <CardDescription className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{student.email}</CardDescription>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-30">
                        <GraduationCap className="h-20 w-20 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">No Students Found</p>
                        <p className="text-xs font-medium max-w-xs mt-2">Add students in the Users section to see their progress records here.</p>
                    </div>
                )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
