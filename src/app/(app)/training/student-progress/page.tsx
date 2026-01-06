'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, User, Trash2 } from 'lucide-react';
import type { StudentProgressReport } from '@/types/training';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../users/personnel/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


type EnrichedReport = StudentProgressReport & {
  studentName?: string;
  instructorName?: string;
  bookingNumber?: number;
};

export default function StudentProgressPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const reportsQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      const reportsCollection = collection(firestore, `tenants/${tenantId}/student-progress-reports`);
      if (selectedStudentId) {
        return query(reportsCollection, where('studentId', '==', selectedStudentId));
      }
      return query(reportsCollection, orderBy('date', 'desc'));
    },
    [firestore, tenantId, selectedStudentId]
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

    const mappedReports = reports.map(report => ({
      ...report,
      bookingNumber: bookingsMap.get(report.bookingId)?.bookingNumber,
      studentName: studentsMap.get(report.studentId!),
      instructorName: instructorsMap.get(report.instructorId!),
    }));

    // If a student is selected, sort the data here on the client-side.
    if (selectedStudentId) {
        return mappedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return mappedReports;
  }, [reports, bookings, students, instructors, selectedStudentId]);

  const handleDeleteReport = (reportId: string) => {
    if (!firestore) return;
    const reportRef = doc(firestore, `tenants/${tenantId}/student-progress-reports`, reportId);
    deleteDocumentNonBlocking(reportRef);
    toast({
        title: "Report Deleted",
        description: "The student progress report has been deleted.",
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>All Student Progress Reports</CardTitle>
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
                    <TableCell className="text-right space-x-2">
                       <Button asChild variant="outline" size="sm">
                          <Link href={`/training/student-progress/${report.id}`}>
                              <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="icon" className="h-9 w-9">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the progress report. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteReport(report.id)}>
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No student progress reports found.
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
