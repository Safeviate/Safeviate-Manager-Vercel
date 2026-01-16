
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types/alert';
import { format } from 'date-fns';
import { Archive } from 'lucide-react';

interface AlertCardProps {
    alert: Alert;
    tenantId: string;
    canManage: boolean;
}

export function AlertCard({ alert, tenantId, canManage }: AlertCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const getCardClass = () => {
        switch (alert.type) {
            case 'Red Tag': return 'border-red-500 bg-red-50';
            case 'Yellow Tag': return 'border-yellow-500 bg-yellow-50';
            default: return '';
        }
    }

    const handleArchive = () => {
        if (!firestore) return;
        const alertRef = doc(firestore, `tenants/${tenantId}/alerts`, alert.id);
        updateDocumentNonBlocking(alertRef, { status: 'Archived' });
        toast({ title: 'Alert Archived', description: `"${alert.title}" has been archived.` });
    };

    return (
        <Card className={cn(getCardClass())}>
            <CardHeader>
                <CardTitle>{alert.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm whitespace-pre-wrap">{alert.content}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Posted on {format(new Date(alert.createdAt), 'PPP')}</span>
                {canManage && (
                    <Button variant="ghost" size="sm" onClick={handleArchive}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
