'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function ChangePasswordClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = payload?.error || 'Could not change your password.';
        setMessage(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Password Change Failed',
          description: errorMessage,
        });
        return;
      }

      toast({
        title: 'Password Updated',
        description: 'Your password has been changed. Please sign in again with the new password.',
      });

      await signOut({ redirect: false });
      router.replace('/login?changed=1');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not change your password.';
      setMessage(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Password Change Failed',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.92))]" />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-8 lg:p-12">
        <Card className="w-full max-w-md border-white/15 bg-slate-900/70 text-white shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20">
              <KeyRound className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-black tracking-tight text-white">
                Change your password
              </CardTitle>
              <CardDescription className="text-sm text-slate-300">
                This account was created with a manual password. Please set your own password before continuing.
              </CardDescription>
            </div>
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
              <ShieldCheck className="h-4 w-4" />
              First login required
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {message ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {message}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-300">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  className="h-12 border-white/10 bg-white/95 font-medium text-slate-950 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-300">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  className="h-12 border-white/10 bg-white/95 font-medium text-slate-950 placeholder:text-slate-400"
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                className="h-12 w-full bg-cyan-500 font-black uppercase tracking-[0.18em] text-slate-950 hover:bg-cyan-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save New Password'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
