
'use client';

import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types/alert';
import { format } from 'date-fns';
import { Archive, Printer, Users } from 'lucide-react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface AlertCardProps {
    alert: Alert;
    tenantId: string;
    canManage: boolean;
    showReadReceipts?: boolean;
}

export function AlertCard({ alert, tenantId, canManage, showReadReceipts = true }: AlertCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const cardRef = useRef<HTMLDivElement>(null);

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

    const handlePrint = () => {
        if (!cardRef.current) return;

        const printWindow = window.open('', '_blank', 'height=600,width=800');

        if (printWindow) {
            printWindow.document.write('<html><head><title>Print Alert</title>');

            // Copy styles from the main document
            const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
            styles.forEach(style => {
                printWindow.document.head.appendChild(style.cloneNode(true));
            });
            
            // Add a basic print style to hide the footer actions
            printWindow.document.head.innerHTML += '<style>@media print { .no-print { display: none !important; } body { padding: 1rem; } }</style>';

            printWindow.document.write('</head><body>');
            printWindow.document.write(cardRef.current.outerHTML);
            printWindow.document.write('</body></html>');

            // Timeout to allow styles to load before printing
            setTimeout(() => {
                printWindow.document.close();
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };


    return (
        <Card className={cn(getCardClass())} ref={cardRef}>
            <CardHeader>
                <CardTitle>{alert.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm whitespace-pre-wrap">{alert.content}</p>
                 {alert.signatureUrl && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Signed:</p>
                        <Image
                            src={alert.signatureUrl}
                            alt="Signature"
                            width={200}
                            height={100}
                            className="bg-white border rounded-md p-1"
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 text-xs text-muted-foreground">
                <div className="flex justify-between w-full">
                    <span>Posted on {format(new Date(alert.createdAt), 'PPP')}</span>
                    <div className="flex items-center gap-2 no-print">
                        <Button variant="ghost" size="sm" onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" /> Print
                        </Button>
                        {canManage && (
                            <Button variant="ghost" size="sm" onClick={handleArchive}>
                                <Archive className="mr-2 h-4 w-4" /> Archive
                            </Button>
                        )}
                    </div>
                </div>
                 {showReadReceipts && (
                    <Accordion type="single" collapsible className="w-full no-print">
                        <AccordionItem value="item-1" className="border-t">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span>Read by {alert.readBy?.length || 0} users</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                {alert.readBy && alert.readBy.length > 0 ? (
                                    <div className="max-h-32 overflow-y-auto text-xs space-y-2">
                                        {alert.readBy.map(receipt => (
                                            <div key={receipt.userId} className="flex justify-between">
                                                <span>{receipt.userName}</span>
                                                <span className="text-muted-foreground">{format(new Date(receipt.readAt), 'PPP p')}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">No one has read this alert yet.</p>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </CardFooter>
        </Card>
    )
}
