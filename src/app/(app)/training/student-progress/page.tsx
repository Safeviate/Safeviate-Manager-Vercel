'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
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
<<<<<<< HEAD
        <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
            <Skeleton className="h-20 w-full" />
=======
        <div className="max-w-[1200px] mx-auto w-full space-y-6 px-1">
            <Skeleton className="h-14 w-full" />
>>>>>>> temp-save-work
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
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
<<<<<<< HEAD
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
=======
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1">
        <Card className="flex flex-col shadow-none border overflow-hidden">
            <MainPageHeader title="Student Progress" />
            
            <div className="p-4 lg:p-6">
                {students && students.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {students.map(student => (
                            <Link key={student.id} href={`/training/student-progress/${student.id}`}>
                                <Card className="hover:bg-muted/50 transition-colors h-full shadow-none border">
                                    <CardHeader className="flex flex-row items-center gap-4">
                                        <Avatar className="h-12 w-12 border">
                                            <AvatarImage src={`https://picsum.photos/seed/${student.firstName}/100/100`} />
                                            <AvatarFallback className="font-bold text-xs">{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-0.5">
                                            <CardTitle className="text-sm font-black uppercase tracking-tight">{student.firstName} {student.lastName}</CardTitle>
                                            <CardDescription className="text-[10px] font-bold uppercase truncate max-w-[180px]">{student.email}</CardDescription>
                                        </div>
>>>>>>> temp-save-work
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
<<<<<<< HEAD
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
=======
                    <Card className="flex items-center justify-center h-64 shadow-none border bg-muted/5">
                        <div className="text-center space-y-4">
                            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                            <div className="space-y-1">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">No Students Found</h3>
                                <p className="text-xs text-muted-foreground italic">Add students in the Users section to see their progress here.</p>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </Card>
>>>>>>> temp-save-work
    </div>
  );
}
