'use client';

import { useEffect, useState } from 'react';
import { Copy, Loader2, RefreshCw, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react';
import { MainPageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type MfaStatus = {
  enabled: boolean;
  pendingEnrollment: boolean;
  recoveryCodesRemaining: number;
  configurationReady: boolean;
};

type SetupPayload = {
  qrSvg: string;
  manualKey: string;
  expiresAt: string;
};

const requestMfa = async (action: string, code?: string) => {
  const response = await fetch('/api/auth/mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, code }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'MFA could not be updated.');
  return payload;
};

export default function SecurityPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  const loadStatus = async () => {
    const response = await fetch('/api/auth/mfa', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload) setStatus(payload);
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const beginSetup = async () => {
    setIsWorking(true);
    try {
      const payload = await requestMfa('setup');
      setSetup(payload);
      setRecoveryCodes([]);
      toast({ title: 'Authenticator setup ready', description: 'Scan the QR code, then enter its current six-digit code.' });
      await loadStatus();
    } catch (error) {
      toast({ variant: 'destructive', title: 'MFA setup unavailable', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsWorking(false);
    }
  };

  const confirmSetup = async () => {
    setIsWorking(true);
    try {
      const payload = await requestMfa('confirm', verificationCode);
      setRecoveryCodes(payload.recoveryCodes || []);
      setSetup(null);
      setVerificationCode('');
      toast({ title: 'MFA enabled', description: 'Save the recovery codes before leaving this page.' });
      await loadStatus();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Code not accepted', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsWorking(false);
    }
  };

  const regenerateCodes = async () => {
    setIsWorking(true);
    try {
      const payload = await requestMfa('regenerate-recovery-codes', currentCode);
      setRecoveryCodes(payload.recoveryCodes || []);
      setCurrentCode('');
      toast({ title: 'Recovery codes replaced', description: 'The previous recovery codes no longer work.' });
      await loadStatus();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Recovery codes not replaced', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsWorking(false);
    }
  };

  const disableMfa = async () => {
    setIsWorking(true);
    try {
      await requestMfa('disable', currentCode);
      setCurrentCode('');
      setRecoveryCodes([]);
      toast({ title: 'MFA disabled', description: 'Your account will use password-only sign-in until you enrol again.' });
      await loadStatus();
    } catch (error) {
      toast({ variant: 'destructive', title: 'MFA remains enabled', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsWorking(false);
    }
  };

  const copyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast({ title: 'Recovery codes copied', description: 'Store them in a secure password manager.' });
  };

  return (
    <div className="space-y-4 p-4">
      <MainPageHeader title="Security & MFA" description="Protect your Safeviate account with an authenticator app and one-time recovery codes." />

      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5" /> Multi-factor authentication</CardTitle>
              <CardDescription className="mt-1">Authenticator-app codes are required after you enrol.</CardDescription>
            </div>
            <Badge variant={status?.enabled ? 'default' : 'outline'}>{status?.enabled ? 'Enabled' : 'Not enabled'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {status && !status.configurationReady ? (
            <div className="flex gap-3 rounded-lg border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-950">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>MFA cannot be enrolled until the administrator configures the encrypted MFA secret key.</p>
            </div>
          ) : null}

          {!status?.enabled && !setup ? (
            <Button onClick={beginSetup} disabled={isWorking || !status?.configurationReady}>
              {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
              Set up authenticator app
            </Button>
          ) : null}

          {setup ? (
            <div className="grid gap-5 rounded-lg border border-border p-4 lg:grid-cols-[220px_1fr]">
              <div className="flex justify-center rounded-lg bg-white p-3" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} />
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">1. Scan this QR code in your authenticator app</p>
                  <p className="mt-1 text-sm text-muted-foreground">If scanning is unavailable, enter this setup key manually:</p>
                  <code className="mt-2 block break-all rounded bg-muted px-3 py-2 text-xs">{setup.manualKey}</code>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-code">2. Enter the current six-digit code</Label>
                  <div className="flex max-w-sm gap-2">
                    <Input id="setup-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
                    <Button onClick={confirmSetup} disabled={isWorking || !verificationCode}>Confirm</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {status?.enabled ? (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">{status.recoveryCodesRemaining} recovery codes remaining. Use one only if you cannot access your authenticator app.</p>
              <div className="space-y-2">
                <Label htmlFor="current-mfa-code">Authenticator or recovery code</Label>
                <Input id="current-mfa-code" value={currentCode} onChange={(event) => setCurrentCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Required to manage MFA" className="max-w-sm" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={beginSetup} disabled={isWorking}><Smartphone className="mr-2 h-4 w-4" />Replace authenticator</Button>
                <Button variant="outline" onClick={regenerateCodes} disabled={isWorking || !currentCode}><RefreshCw className="mr-2 h-4 w-4" />Replace recovery codes</Button>
                <Button variant="destructive" onClick={disableMfa} disabled={isWorking || !currentCode}>Disable MFA</Button>
              </div>
            </div>
          ) : null}

          {recoveryCodes.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-amber-950">
              <div className="flex items-center justify-between gap-3"><p className="font-semibold">Save these recovery codes now</p><Button size="sm" variant="outline" onClick={copyRecoveryCodes}><Copy className="mr-2 h-4 w-4" />Copy</Button></div>
              <p className="text-sm">Each code can be used once. They will not be shown again.</p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-5">{recoveryCodes.map((code) => <code key={code} className="rounded border border-amber-300 bg-white px-2 py-1 text-center">{code}</code>)}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
