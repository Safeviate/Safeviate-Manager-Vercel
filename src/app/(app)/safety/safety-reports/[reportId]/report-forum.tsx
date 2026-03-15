'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { doc, arrayUnion, collection, query } from 'firebase/firestore';
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

  const handleSendMessage = () => {
    if (!newMessage.trim() || !userProfile || !firestore) return;

    setIsSubmitting(true);
    const reportRef = doc(firestore, `tenants/${tenantId}/safety-reports`, report.id);
    
    const messageItem: ReportDiscussionItem = {
      id: uuidv4(),
      userId: userProfile.id,
      userName: `${userProfile.firstName} ${userProfile.lastName}`,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      assignedToId: assignedUserId || undefined,
      assignedToName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : undefined,
    };

    updateDocumentNonBlocking(reportRef, {
      discussion: arrayUnion(messageItem)
    });

    setNewMessage('');
    setAssignedUserId(null);
    setIsSubmitting(false);
    toast({ title: 'Comment Posted' });
  };

  const sortedMessages = [...(report.discussion || [])].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <Card className="flex flex-col h-[calc(100vh-300px)] overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Report Discussion</CardTitle>
            <CardDescription>Collaborative forum for investigators and staff to discuss findings and outcomes.</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden bg-muted/5">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {sortedMessages.length > 0 ? (
              sortedMessages.map((msg) => {
                const isMe = msg.userId === userProfile?.id;
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={`https://picsum.photos/seed/${msg.userName}/100/100`} />
                      <AvatarFallback>{msg.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : ''}`}>
                      <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-bold">{msg.userName}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(msg.timestamp), 'dd MMM HH:mm')}</span>
                      </div>
                      <div className={`p-3 rounded-2xl text-sm shadow-sm border space-y-2 ${
                        isMe ? 'bg-primary text-primary-foreground rounded-tr-none border-primary/20' : 'bg-background rounded-tl-none border-border'
                      }`}>
                        {msg.assignedToName && (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit text-[10px] bg-background/50 border-none">
                                <UserPlus className="h-3 w-3" />
                                Assigned to: {msg.assignedToName}
                            </Badge>
                        )}
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <MessageSquare className="h-12 w-12 mb-4" />
                <p className="text-sm font-medium">No discussion started yet.</p>
                <p className="text-xs">Be the first to share a thought on this report.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="shrink-0 border-t p-4 bg-background flex flex-col gap-3">
        {assignedUserId && (
            <div className="flex items-center gap-2 w-full">
                <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-2 border-primary/20">
                    <UserPlus className="h-3.5 w-3.5 text-primary" />
                    <span>Assigning to: <span className="font-bold">{assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : '...'}</span></span>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-transparent" onClick={() => setAssignedUserId(null)}>
                        <X className="h-3 w-3" />
                    </Button>
                </Badge>
            </div>
        )}
        <div className="flex w-full gap-3 items-end">
          <div className="flex-1 flex flex-col gap-2">
            <Textarea 
                placeholder="Type your comment here..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
                }}
            />
            <div className="flex items-center gap-2">
                <Select onValueChange={setAssignedUserId} value={assignedUserId || ''}>
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                        <UserPlus className="h-3.5 w-3.5 mr-2" />
                        <SelectValue placeholder="Assign user..." />
                    </SelectTrigger>
                    <SelectContent>
                        {(personnel || []).map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.firstName} {p.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || isSubmitting}
            className="shrink-0 mb-1 h-8"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
