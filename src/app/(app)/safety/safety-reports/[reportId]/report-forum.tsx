'use client';

import { useState, useMemo } from 'react';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, arrayUnion, collection, query, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Send, MessageSquare, UserPlus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { SafetyReport, ReportDiscussionItem } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ReportForumProps {
  report: SafetyReport;
  tenantId: string;
}

export function ReportForum({ report, tenantId }: ReportForumProps) {
  const [newMessage, setNewMessage] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const personnelQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );
  const { data: personnel } = useCollection<Personnel>(personnelQuery);

  const assignedUser = useMemo(() => 
    personnel?.find(p => p.id === assignedUserId), 
    [personnel, assignedUserId]
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userProfile || !firestore) return;

    setIsSubmitting(true);
    const reportRef = doc(firestore, `tenants/${tenantId}/safety-reports`, report.id);
    
    const messageItem: ReportDiscussionItem = {
      id: uuidv4(),
      userId: userProfile.id,
      userName: `${userProfile.firstName} ${userProfile.lastName}`,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    if (assignedUserId) {
      messageItem.assignedToId = assignedUserId;
    }
    
    if (assignedUser) {
      messageItem.assignedToName = `${assignedUser.firstName} ${assignedUser.lastName}`;
    }

    try {
      await updateDoc(reportRef, {
        discussion: arrayUnion(messageItem)
      });
      setNewMessage('');
      setAssignedUserId(null);
      toast({ title: 'Comment Posted' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Post failed',
        description: error instanceof Error ? error.message : 'Unable to post this comment right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedMessages = [...(report.discussion || [])].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b bg-muted/5 p-4 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black uppercase tracking-tight">Report Discussion</h3>
      </div>
      
      <div className="flex-1 min-h-0 p-0 overflow-hidden bg-muted/5">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {sortedMessages.length > 0 ? (
              sortedMessages.map((msg) => {
                const isMe = msg.userId === userProfile?.id;
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 shrink-0 border">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.userName}`} />
                      <AvatarFallback>{msg.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : ''}`}>
                      <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-black uppercase tracking-tight">{msg.userName}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{format(new Date(msg.timestamp), 'dd MMM HH:mm')}</span>
                      </div>
                      <div className={`p-4 rounded-2xl text-sm shadow-sm border space-y-2 ${
                        isMe ? 'bg-primary text-primary-foreground rounded-tr-none border-primary/20 font-medium' : 'bg-background rounded-tl-none border-slate-200 font-medium'
                      }`}>
                        {msg.assignedToName && (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit text-[10px] font-black uppercase bg-background/50 border-none">
                                <UserPlus className="h-3 w-3" />
                                Assigned: {msg.assignedToName}
                            </Badge>
                        )}
                        <p className="leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                <MessageSquare className="h-12 w-12 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">No Discussion Yet</p>
                <p className="text-xs font-medium">Start a conversation or assign a task to a team member.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="shrink-0 border-t p-6 bg-background flex flex-col gap-4">
        {assignedUserId && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <UserPlus className="h-3 w-3" />
              Assigning task to: {assignedUser?.firstName} {assignedUser?.lastName}
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-primary/10" onClick={() => setAssignedUserId(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        <div className="flex gap-3 items-start">
          <div className="flex-1 space-y-2">
            <Textarea 
              placeholder="Write a comment or investigation note..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[80px] bg-muted/5 border-slate-300 font-medium text-sm focus-visible:ring-primary"
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest whitespace-nowrap">Assign To:</span>
                <Select onValueChange={setAssignedUserId} value={assignedUserId || 'none'}>
                  <SelectTrigger className="h-8 w-[180px] text-[10px] font-black uppercase bg-background border-slate-300">
                    <SelectValue placeholder="Team Member..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-[10px] font-black uppercase">Unassigned</SelectItem>
                    {personnel?.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.firstName} {p.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button 
            disabled={!newMessage.trim() || isSubmitting} 
            onClick={handleSendMessage}
            className="h-20 w-20 rounded-xl bg-emerald-700 hover:bg-emerald-800 shadow-md flex flex-col gap-1 shrink-0"
          >
            <Send className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase">Post</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
