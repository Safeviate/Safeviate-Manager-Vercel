'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Send, MessageSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { SafetyReport, ReportDiscussionItem } from '@/types/safety-report';

interface ReportForumProps {
  report: SafetyReport;
  tenantId: string;
}

export function ReportForum({ report, tenantId }: ReportForumProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

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
    };

    updateDocumentNonBlocking(reportRef, {
      discussion: arrayUnion(messageItem)
    });

    setNewMessage('');
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
                      <div className={`p-3 rounded-2xl text-sm shadow-sm border ${
                        isMe ? 'bg-primary text-primary-foreground rounded-tr-none border-primary/20' : 'bg-background rounded-tl-none border-border'
                      }`}>
                        {msg.message}
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

      <CardFooter className="shrink-0 border-t p-4 bg-background">
        <div className="flex w-full gap-3 items-end">
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
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || isSubmitting}
            className="shrink-0 mb-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
