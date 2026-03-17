
'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, FileCheck, ShieldAlert, User } from 'lucide-react';
import type { ERPEvent, ERPCollectedDocument, ERPLogEntry } from '@/types/erp';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

interface DocumentsTabProps {
  tenantId: string;
}

const REQUIRED_DOCUMENTS = [
  { id: 'doc-1', name: 'Pilot Logbook' },
  { id: 'doc-2', name: 'Medical Certificate' },
  { id: 'doc-3', name: 'Aircraft Flight Log (Technical Log)' },
  { id: 'doc-4', name: 'Aircraft Maintenance Logbooks' },
  { id: 'doc-5', name: 'Weight & Balance Sheet' },
  { id: 'doc-6', name: 'Flight Plan (filed copy)' },
  { id: 'doc-7', name: 'Weather Briefing Documents' },
  { id: 'doc-8', name: 'Fuel Receipts / Upload Records' },
  { id: 'doc-9', name: 'Student Training Records' },
  { id: 'doc-10', name: 'NOTAMs / ATC Flight Strip copies' },
];

export function DocumentsTab({ tenantId }: DocumentsTabProps) {
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();

  const eventsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/erp-events`), orderBy('startedAt', 'desc')) : null),
    [firestore, tenantId]
  );
  const { data: events } = useCollection<ERPEvent>(eventsQuery);

  const activeEvent = useMemo(() => events?.find(e => e.status !== 'Closed'), [events]);

  const handleToggleDocument = (docId: string, docName: string) => {
    if (!activeEvent || !firestore) return;

    const currentDocs = activeEvent.collectedDocuments || [];
    const existingIndex = currentDocs.findIndex(d => d.id === docId);
    const eventRef = doc(firestore, `tenants/${tenantId}/erp-events`, activeEvent.id);

    let updatedDocs: ERPCollectedDocument[];
    let logEntry: ERPLogEntry | null = null;

    if (existingIndex > -1) {
      // If it was secured, we're un-securing it
      updatedDocs = currentDocs.filter(d => d.id !== docId);
    } else {
      // Securing it
      const newDoc: ERPCollectedDocument = {
        id: docId,
        name: docName,
        securedAt: new Date().toISOString(),
        securedBy: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'System',
        status: 'Secured'
      };
      updatedDocs = [...currentDocs, newDoc];
      
      logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        description: `EVIDENCE SECURED: ${docName}`,
        loggedBy: userProfile?.id || 'System',
        userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'System',
        isMilestone: true
      };
    }

    const updates: any = { collectedDocuments: updatedDocs };
    if (logEntry) {
      updates.log = arrayUnion(logEntry);
    }

    updateDocumentNonBlocking(eventRef, updates);
    toast({ title: existingIndex > -1 ? 'Status reset' : 'Document Secured' });
  };

  return (
    <div className="space-y-6">
      <div className="px-1">
        <h2 className="text-xl font-bold flex items-center gap-2 font-headline">
          {activeEvent ? (
            <span className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" /> Document Collection Tracker
            </span>
          ) : 'Standard Evidence List'}
        </h2>
        {activeEvent ? (
          <p className="text-sm text-muted-foreground mt-1">
            Tracking evidence collection for: <span className="font-bold text-foreground">{activeEvent.title}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            A guide of critical documents that must be secured immediately following an incident.
          </p>
        )}
      </div>

      <Card className="shadow-none border">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="text-sm font-headline flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" /> Required Evidence & Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Secured By</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REQUIRED_DOCUMENTS.map((doc) => {
                const securedInfo = activeEvent?.collectedDocuments?.find(d => d.id === doc.id);
                const isSecured = !!securedInfo;

                return (
                  <TableRow key={doc.id} className={cn(isSecured && "bg-emerald-50/30")}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      {isSecured ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 h-5 px-2">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Secured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground opacity-50 h-5 px-2 gap-1">
                          <Circle className="h-2.5 w-2.5" /> Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {isSecured ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {securedInfo.securedBy}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {isSecured && securedInfo.securedAt ? format(new Date(securedInfo.securedAt), 'HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {activeEvent ? (
                        <Button 
                          size="sm" 
                          variant={isSecured ? "ghost" : "default"} 
                          className={cn("h-7 text-[10px] uppercase font-bold", isSecured && "text-destructive hover:bg-destructive/10")}
                          onClick={() => handleToggleDocument(doc.id, doc.name)}
                        >
                          {isSecured ? 'Reset Status' : 'Mark Secured'}
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Start session to track</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!activeEvent && (
        <Card className="bg-primary/5 border-primary/20 border shadow-none">
          <CardHeader>
            <CardTitle className="text-sm">Why is document collection critical?</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground leading-relaxed">
            <p>Following an aviation incident, investigators (CAA/TSB) will require immediate access to original records to determine operating margins, crew currency, and aircraft airworthiness at the time of the event.</p>
            <p><span className="font-bold text-foreground">Action:</span> Ensure all physical logbooks are removed from the aircraft and secured in a fire-proof safe. Digital records should be exported or frozen to prevent post-incident modification.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
