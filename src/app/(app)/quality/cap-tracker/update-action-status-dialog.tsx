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
import type { CorrectiveAction, CorrectiveActionStatus } from '@/types/quality';

type EnrichedCorrectiveAction = CorrectiveAction & {
  auditId: string;
  auditNumber: string;
};

interface UpdateActionStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  action: EnrichedCorrectiveAction;
  tenantId: string;
}

const STATUS_OPTIONS: CorrectiveActionStatus[] = ['Open', 'In Progress', 'Closed', 'Cancelled'];

export function UpdateActionStatusDialog({ isOpen, onClose, action, tenantId }: UpdateActionStatusDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState<CorrectiveActionStatus>(action.status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!firestore || newStatus === action.status) {
      onClose();
      return;
    }
    
    setIsSubmitting(true);

    try {
        // Corrective Actions are nested within a `correctiveActionPlans` collection
        // This needs a more complex update logic based on the full data structure.
        // For now, this is a placeholder to show the concept.
        // In a real scenario, we'd fetch the audit, find the action, update it, and save the whole audit doc.
      
      const auditRef = doc(firestore, `tenants/${tenantId}/quality-audits`, action.auditId);
      
      // THIS IS A SIMPLIFICATION - a real implementation would need to read the audit,
      // update the specific action in the array, and write the whole document back.
      // This is complex and risky without transactions. A better structure would be subcollections.
      // For now, we will assume a simplified direct update is possible for demonstration.
      
      // Let's assume for now that we have a separate collection for CAPs for simplicity.
      const capRef = doc(firestore, `tenants/${tenantId}/corrective-action-plans`, action.id); // This path is hypothetical
      
      // The below toast is a placeholder for the actual logic that would be needed.
      // updateDocumentNonBlocking(capRef, { status: newStatus });

      toast({
        title: 'Status Update (Simulated)',
        description: `Status for action on Audit #${action.auditNumber} would be changed to "${newStatus}". Full implementation pending data model finalization.`,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Action Status</DialogTitle>
          <DialogDescription>
            For corrective action on Audit #{action.auditNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Action</p>
            <p>{action.description}</p>
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
