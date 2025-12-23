'use client';

import { useState } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { CorrectiveActionPlan, CorrectiveActionStatus } from '@/types/quality';
import type { EnrichedCorrectiveActionPlan } from '../cap-tracker';

interface UpdateActionStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cap: EnrichedCorrectiveActionPlan;
  tenantId: string;
}

const STATUS_OPTIONS: CorrectiveActionStatus[] = ['Open', 'In Progress', 'Closed', 'Cancelled'];

export function UpdateActionStatusDialog({ isOpen, onClose, cap, tenantId }: UpdateActionStatusDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState<CorrectiveActionStatus>(cap.status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!firestore || newStatus === cap.status) {
      onClose();
      return;
    }
    
    setIsSubmitting(true);

    try {
      const capRef = doc(firestore, `tenants/${tenantId}/corrective-action-plans`, cap.id);
      
      await updateDocumentNonBlocking(capRef, { status: newStatus });

      toast({
        title: 'Status Updated',
        description: `CAP for Audit #${cap.auditNumber} has been updated to "${newStatus}".`,
      });

      onClose();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update CAP Status</DialogTitle>
          <DialogDescription>
            For finding on Audit #{cap.auditNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Finding</p>
            <p>{cap.findingDescription}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select onValueChange={(value: CorrectiveActionStatus) => setNewStatus(value)} defaultValue={newStatus}>
                <SelectTrigger id="status">
                    <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
