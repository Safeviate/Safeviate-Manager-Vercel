
'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CapActionsForm } from './cap-actions-form';
import type { CorrectiveActionPlan } from '@/types/quality';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define the enriched type right here where it's used or import from a shared types file if needed elsewhere
export type EnrichedCorrectiveActionPlan = CorrectiveActionPlan & {
  auditNumber: string;
  findingDescription: string;
};

interface ManageCapDialogProps {
    isOpen: boolean;
    onClose: () => void;
    cap: EnrichedCorrectiveActionPlan;
    tenantId: string;
    personnel: Personnel[];
}

export function ManageCapDialog({ isOpen, onClose, cap, tenantId, personnel }: ManageCapDialogProps) {

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Corrective Action Plan</DialogTitle>
                    <DialogDescription>
                        For finding on Audit #{cap.auditNumber}: {cap.findingDescription}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="py-4">
                        <CapActionsForm 
                            cap={cap}
                            tenantId={tenantId}
                            personnel={personnel}
                            onFormSubmit={onClose}
                        />
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
