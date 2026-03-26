'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCard } from '@/app/(app)/operations/alerts/alert-card';
import type { Alert } from '@/types/alert';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, arrayUnion, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface MandatoryAlertsProps {
  alerts: Alert[];
  onAcknowledged: () => void;
}

export function MandatoryAlerts({ alerts, onAcknowledged }: MandatoryAlertsProps) {
  const firestore = useFirestore();
  const { userProfile, tenantId } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAcknowledge = async () => {
    if (!firestore || !userProfile || !tenantId || alerts.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      const readReceipt = {
        userId: userProfile.id,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        readAt: new Date().toISOString(),
      };
      
      const batch = writeBatch(firestore);

      alerts.forEach(alert => {
        const alertRef = doc(firestore, `tenants/${tenantId}/alerts`, alert.id);
        batch.update(alertRef, { readBy: arrayUnion(readReceipt) });
      });

      await batch.commit();

      toast({
        title: 'Alerts Acknowledged',
        description: `Thank you for reading ${alerts.length} important alert(s).`
      });

      onAcknowledged();

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Acknowledgement Failed',
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Important: Must-Read Alerts</DialogTitle>
          <DialogDescription>
            Please review the following alerts before you continue.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6">
            <div className="space-y-4 py-4">
                {alerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={false} showReadReceipts={false} />
                ))}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleAcknowledge} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Acknowledge & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
