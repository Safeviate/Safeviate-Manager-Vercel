'use client';

import { useState, useRef } from 'react';
import { doc, updateDoc, collection, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { SecureSignaturePad } from '@/components/secure-signature-pad';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useStorageUpload } from '@/hooks/use-storage-upload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, PenTool, Upload, FileText, ImageIcon, Loader2 } from 'lucide-react';
import type { TaskCard } from '@/types/workpack';

interface TaskCardItemProps {
  workpackId: string;
  taskCard: TaskCard;
}

export function TaskCardItem({ workpackId, taskCard }: TaskCardItemProps) {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const { uploadFile, isUploading } = useStorageUpload();
  
  const [isSigning, setIsSigning] = useState(false);
  const [signMode, setSignMode] = useState<'MECHANIC' | 'INSPECTOR'>('MECHANIC');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPendingInspection = taskCard.isCompleted && taskCard.requiresInspector && !taskCard.isInspected;
  const isFullyClosed = taskCard.isCompleted && (!taskCard.requiresInspector || taskCard.isInspected);

  const handleSignOff = async (signatureBase64: string, credentials: { pin: string }) => {
    if (!firestore || !tenantId) return;
    
    const signaturesRef = collection(firestore, `tenants/${tenantId}/workpacks/${workpackId}/taskCards/${taskCard.id}/signatures`);
    const tcRef = doc(firestore, `tenants/${tenantId}/workpacks/${workpackId}/taskCards`, taskCard.id);

    try {
      await addDoc(signaturesRef, {
        signatureImage: signatureBase64,
        signatoryUserId: authUser?.uid ?? 'unknown',
        role: signMode, 
        timestamp: serverTimestamp(),
        authMethod: 'PIN_VALIDATED'
      });

      if (signMode === 'MECHANIC') {
        await updateDoc(tcRef, {
          isCompleted: true,
          completedAt: serverTimestamp()
        });
      } else if (signMode === 'INSPECTOR') {
        await updateDoc(tcRef, {
          isInspected: true,
          inspectedAt: serverTimestamp()
        });
      }

      toast({ title: 'Task Certified', description: `Your ${signMode.toLowerCase()} signature was secured.` });
      setIsSigning(false);
    } catch (e: any) {
      toast({ title: 'Sign-Off Failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId || !firestore) return;

    try {
      const ext = file.name.split('.').pop();
      const path = `tenants/${tenantId}/workpacks/${workpackId}/media/${taskCard.id}_${Date.now()}.${ext}`;
      const downloadURL = await uploadFile(file, path);
      
      const tcRef = doc(firestore, `tenants/${tenantId}/workpacks/${workpackId}/taskCards`, taskCard.id);
      await updateDoc(tcRef, {
        attachments: arrayUnion({
          id: Date.now().toString(),
          url: downloadURL,
          name: file.name,
          type: file.type.includes('pdf') ? 'PDF' : 'IMAGE'
        })
      });

      toast({ title: 'Attachment Added', description: 'Evidence was securely attached.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      toast({ title: 'Upload Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card className={`border-2 transition-all ${isFullyClosed ? 'border-primary/40 bg-primary/5' : isPendingInspection ? 'border-accent/50 bg-accent/5' : 'border-border shadow-sm'}`}>
      <CardHeader className="p-4 md:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 bg-muted/5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <CardTitle className="font-mono text-primary font-black uppercase tracking-tight">{taskCard.taskNumber}</CardTitle>
            
            {isFullyClosed ? (
               <Badge className="bg-emerald-100 text-emerald-700 bg-emerald-100 hover:bg-emerald-100 border-none font-bold">
                 <ShieldCheck className="h-3 w-3 mr-1" />
                 Certified & Closed
               </Badge>
            ) : isPendingInspection ? (
               <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-bold">
                 <ShieldCheck className="h-3 w-3 mr-1" />
                 Pending Inspection (RII)
               </Badge>
            ) : (
               <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">Open Task</Badge>
            )}

            {taskCard.requiresInspector && (
               <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-red-600 border-red-200 bg-red-50">RII</Badge>
            )}
          </div>
          <CardDescription className="text-slate-700 font-medium mt-2 whitespace-pre-wrap">
            {taskCard.taskDescription}
          </CardDescription>

          <div className="mt-4 flex flex-col md:flex-row gap-4">
            {taskCard.partsInstalled && taskCard.partsInstalled.length > 0 && (
              <div className="flex-1 space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">Parts Tracking</p>
                <div className="bg-slate-100/50 rounded-lg p-2 border">
                  {taskCard.partsInstalled.map((p, i) => (
                    <div key={i} className="text-[11px] font-mono flex justify-between border-b last:border-0 border-slate-200 py-1">
                      <span className="font-bold">{p.partNumber}</span>
                      <span className="text-muted-foreground">SN: {p.serialNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {taskCard.toolsUsed && taskCard.toolsUsed.length > 0 && (
              <div className="flex-1 space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">Tools & Equipment</p>
                <div className="flex flex-wrap gap-1">
                  {taskCard.toolsUsed.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] font-mono bg-slate-200 text-slate-700 uppercase">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
           {!taskCard.isCompleted && !isSigning && (
            <Button 
              onClick={() => { setSignMode('MECHANIC'); setIsSigning(true); }}
              className="w-full text-xs font-black uppercase shadow-md gap-2"
            >
              <PenTool className="h-4 w-4" /> Mechanic Sign-Off
            </Button>
          )}

          {isPendingInspection && !isSigning && (
             <Button 
              onClick={() => { setSignMode('INSPECTOR'); setIsSigning(true); }}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-black uppercase shadow-md gap-2"
            >
              <ShieldCheck className="h-4 w-4" /> Inspector Sign-Off
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Attachments Display Area */}
      {taskCard.attachments && taskCard.attachments.length > 0 && (
        <CardContent className="px-4 md:px-6 py-4 bg-white border-t">
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3">Evidence & Attachments</p>
          <div className="flex flex-wrap gap-3">
             {taskCard.attachments.map(att => (
               <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border rounded p-2 text-xs font-medium hover:bg-muted transition-colors">
                 {att.type === 'PDF' ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                 <span className="truncate max-w-[150px]">{att.name}</span>
               </a>
             ))}
          </div>
        </CardContent>
      )}

      {/* Attachments Actions */}
      {!isFullyClosed && !isSigning && (
        <CardFooter className="px-4 md:px-6 py-3 bg-muted/10 border-t flex justify-end">
           <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
           <Button variant="outline" size="sm" className="text-xs font-bold gap-2" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
             {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
             Attach Evidence
           </Button>
        </CardFooter>
      )}
      
      {isSigning && (
         <CardContent className="p-4 md:p-6 bg-muted/30 border-t">
           <div className="flex justify-end mb-4">
             <Button variant="ghost" size="sm" onClick={() => setIsSigning(false)}>Cancel Sign-Off</Button>
           </div>
           
           <SecureSignaturePad 
             onSign={handleSignOff} 
             title={signMode === 'MECHANIC' ? "Mechanic Certification" : "Inspector RII Certification"}
             description={signMode === 'MECHANIC' 
                ? "Ensure the work defined in this task card was completed per regulatory standards."
                : "Verify the RII work was performed correctly and per the approved maintenance manual instructions."}
           />
         </CardContent>
      )}
    </Card>
  );
}
