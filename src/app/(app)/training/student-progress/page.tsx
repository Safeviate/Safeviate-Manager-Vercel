'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PilotProfile } from '../../users/personnel/page';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap } from 'lucide-react';

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
        <div className="max-w-6xl mx-auto w-full space-y-6">
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </div>
    );
  }

  if (error) {
      return <p className="text-destructive text-center p-8">Error: {error.message}</p>
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
        <div className="px-1">
            <h1 className="text-3xl font-bold tracking-tight">Student Progress</h1>
            <p className="text-muted-foreground">Select a student to view their training records and milestones.</p>
        </div>
        {students && students.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map(student => (
                    <Link key={student.id} href={`/training/student-progress/${student.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors h-full shadow-none border">
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={`https://picsum.photos/seed/${student.firstName}/100/100`} />
                                    <AvatarFallback>{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg">{student.firstName} {student.lastName}</CardTitle>
                                    <CardDescription>{student.email}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        ) : (
             <Card className="flex items-center justify-center h-48 shadow-none border">
                <div className="text-center">
                    <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Students Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Add students in the Users section to see their progress here.</p>
                </div>
            </Card>
        )}
    </div>
  );
}
