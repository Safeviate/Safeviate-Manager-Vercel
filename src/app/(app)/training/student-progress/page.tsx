'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Skeleton } from '@/components/ui/skeleton';
import type { PilotProfile } from '../../users/personnel/page';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function StudentProgressPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();

  const studentsQuery = useMemoFirebase(
    () => firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/students`)) : null,
    [firestore, tenantId]
  );
  
  const { data: students, isLoading: isLoadingStudents, error } = useCollection<PilotProfile>(studentsQuery);

  if (isLoadingStudents) {
    return (
        <div className="max-w-[1200px] mx-auto w-full space-y-6 px-1">
            <Skeleton className="h-14 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    );
  }

  if (error) {
      return <p className="max-w-[1200px] mx-auto w-full text-destructive text-center p-8">Error: {error.message}</p>
  }

  return (
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
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
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
    </div>
  );
}
