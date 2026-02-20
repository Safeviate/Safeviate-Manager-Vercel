'use client';

import { useState, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { MaintenanceLog } from '@/types/maintenance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AircraftMaintenanceProps {
  aircraftId: string;
  tenantId: string;
}

function MaintenanceLogForm({
  aircraftId,
  tenantId,
  existingLog,
  onFinished,
}: {
  aircraftId: string;
  tenantId: string;
  existingLog?: MaintenanceLog | null;
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [description, setDescription] = useState(existingLog?.description || '');
  const [procedure, setProcedure] = useState(existingLog?.procedure || '');

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Description is required' });
      return;
    }
    if (!firestore) return;

    if (existingLog) {
      const logRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`, existingLog.id);
      updateDocumentNonBlocking(logRef, { description, procedure });
      toast({ title: 'Log updated' });
    } else {
      const logsCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
      addDocumentNonBlocking(logsCollection, {
        aircraftId,
        description,
        procedure,
        date: new Date().toISOString(),
      });
      toast({ title: 'New maintenance log added' });
    }
    onFinished();
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the maintenance issue or snag..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="procedure">Procedure / Action Taken</Label>
        <Textarea
          id="procedure"
          value={procedure}
          onChange={(e) => setProcedure(e.target.value)}
          placeholder="Describe the work performed to rectify the issue..."
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={handleSubmit}>Save</Button>
      </DialogFooter>
    </div>
  );
}

export function AircraftMaintenance({ aircraftId, tenantId }: AircraftMaintenanceProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);

  const maintenanceLogsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(
              firestore,
              `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`
            ),
            orderBy('date', 'desc')
          )
        : null,
    [firestore, tenantId, aircraftId]
  );
  
  const { data: logs, isLoading } = useCollection<MaintenanceLog>(maintenanceLogsQuery);
  
  const handleOpenDialog = (log: MaintenanceLog | null = null) => {
    setEditingLog(log);
    setIsDialogOpen(true);
  }

  const handleDialogFinished = () => {
    setIsDialogOpen(false);
    setEditingLog(null);
  };
  
  const handleDeleteLog = async (logId: string) => {
      if (!firestore) return;
      const logRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`, logId);
      await deleteDocumentNonBlocking(logRef);
      toast({ title: 'Maintenance log deleted' });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Maintenance Log / Snags</CardTitle>
              <CardDescription>
                A record of all maintenance events and reported snags for this aircraft.
              </CardDescription>
            </div>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Log Entry
              </Button>
            </DialogTrigger>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-1/3">Description</TableHead>
                  <TableHead className="w-1/3">Action Taken</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(log.date), 'PPP')}
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>{log.procedure}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleOpenDialog(log)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDeleteLog(log.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No maintenance logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <DialogContent>
          <DialogHeader>
              <DialogTitle>{editingLog ? 'Edit' : 'Add'} Maintenance Log</DialogTitle>
              <DialogDescription>
                  {editingLog ? 'Update the details for this log entry.' : 'Record a new maintenance issue or action.'}
              </DialogDescription>
          </DialogHeader>
          <MaintenanceLogForm 
            aircraftId={aircraftId} 
            tenantId={tenantId}
            existingLog={editingLog}
            onFinished={handleDialogFinished}
          />
      </DialogContent>
    </Dialog>
  );
}
