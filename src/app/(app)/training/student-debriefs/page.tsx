
'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { StudentProgressReport } from '@/types/training';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../users/personnel/page';

type EnrichedReport = StudentProgressReport & {
  studentName?: string;
  instructorName?: string;
  bookingNumber?: number;
};

export default function StudentDebriefsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const reportsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, `tenants/${tenantId}/student-progress-reports`), orderBy('date', 'desc')) : null,
    [firestore, tenantId]
  );
  const bookingsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null,
    [firestore, tenantId]
  );
  const studentsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null,
    [firestore, tenantId]
  );
  const instructorsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null,
    [firestore, tenantId]
  );
  
  const { data: reports, isLoading: isLoadingReports } = useCollection<StudentProgressReport>(reportsQuery);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);
  const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);

  const isLoading = isLoadingReports || isLoadingBookings || isLoadingStudents || isLoadingInstructors;

  const enrichedReports = useMemo((): EnrichedReport[] => {
    if (!reports || !bookings || !students || !instructors) return [];

    const bookingsMap = new Map(bookings.map(b => [b.id, b]));
    const studentsMap = new Map(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
    const instructorsMap = new Map(instructors.map(i => [i.id, `${i.firstName} ${i.lastName}`]));

    return reports.map(report => ({
      ...report,
      bookingNumber: bookingsMap.get(report.bookingId)?.bookingNumber,
      studentName: studentsMap.get(report.studentId),
      instructorName: instructorsMap.get(report.instructorId),
    }));
  }, [reports, bookings, students, instructors]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Student Debriefs</CardTitle>
        <CardDescription>A complete history of all training debriefs filed by instructors.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Booking #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedReports.length > 0 ? (
                enrichedReports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell>{format(new Date(report.date), 'PPP')}</TableCell>
                    <TableCell>{report.bookingNumber || 'N/A'}</TableCell>
                    <TableCell>{report.studentName || 'Unknown Student'}</TableCell>
                    <TableCell>{report.instructorName || 'Unknown Instructor'}</TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="outline" size="sm">
                          {/* This link will need a proper destination once a detail view is created */}
                          <Link href="#">
                              <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No student debriefs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
