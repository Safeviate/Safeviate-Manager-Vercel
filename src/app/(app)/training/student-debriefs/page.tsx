
'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, User } from 'lucide-react';
import type { StudentProgressReport } from '@/types/training';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../users/personnel/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


type EnrichedReport = StudentProgressReport & {
  studentName?: string;
  instructorName?: string;
  bookingNumber?: number;
};

export default function StudentDebriefsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

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

    let filteredReports = reports;

    if (selectedStudentId) {
        filteredReports = reports.filter(report => report.studentId === selectedStudentId);
    }
    
    return filteredReports.map(report => ({
      ...report,
      bookingNumber: bookingsMap.get(report.bookingId)?.bookingNumber,
      studentName: studentsMap.get(report.studentId),
      instructorName: instructorsMap.get(report.instructorId),
    }));
  }, [reports, bookings, students, instructors, selectedStudentId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>All Student Debriefs</CardTitle>
                <CardDescription>A complete history of all training debriefs filed by instructors.</CardDescription>
            </div>
            <div className="w-64">
                <Select onValueChange={(value) => setSelectedStudentId(value === 'all' ? null : value)}>
                    <SelectTrigger>
                        <User className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by student..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        {students?.map(student => (
                             <SelectItem key={student.id} value={student.id}>
                                <div className="flex items-center gap-2">
                                     <Avatar className="h-6 w-6">
                                        <AvatarImage src={`https://picsum.photos/seed/${student.firstName}/100/100`} />
                                        <AvatarFallback>{student.firstName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <span>{student.firstName} {student.lastName}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
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
