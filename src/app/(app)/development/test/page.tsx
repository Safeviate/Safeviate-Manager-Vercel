'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';

export default function TestPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('Test User');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<null | {
    ok: boolean;
    message: string;
    diagnostics?: Record<string, unknown> | null;
  }>(null);

  const handleSend = async () => {
    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Enter an email address to send a test welcome message.',
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/admin/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || 'Test User',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error || 'Failed to send test welcome email.';
        setLastResult({
          ok: false,
          message,
          diagnostics: payload?.diagnostics || null,
        });
        throw new Error(message);
      }

      setLastResult({
        ok: true,
        message: payload?.message || `Welcome email sent to ${email.trim()}.`,
        diagnostics: payload?.diagnostics || null,
      });

      toast({
        title: 'Test Email Sent',
        description: `Welcome email sent to ${email.trim()}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Email Failed',
        description: error.message || 'Could not send test welcome email.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto w-full px-1">
      <Card className="shadow-none border">
        <CardHeader>
          <CardTitle className="text-base font-black uppercase tracking-wide">Welcome Email Test</CardTitle>
          <CardDescription>Send a test welcome email without creating a user profile first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="test-name">Recipient Name</Label>
            <Input
              id="test-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Test User"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="test-email">Recipient Email</Label>
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={isSending} className="text-xs font-black uppercase gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send Test Welcome Email
            </Button>
          </div>

          {lastResult ? (
            <div className={`rounded-md border p-3 text-xs ${lastResult.ok ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
              <p className="font-black uppercase tracking-wide">{lastResult.ok ? 'Last Send: Success' : 'Last Send: Failed'}</p>
              <p className="mt-1 font-medium">{lastResult.message}</p>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded bg-white/80 p-2 text-[11px]">
                {JSON.stringify(lastResult.diagnostics || {}, null, 2)}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
