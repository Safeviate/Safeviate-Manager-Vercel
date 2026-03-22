
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, initiateAnonymousSignIn, initiateEmailSignIn } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isUserLoginLoading, setIsUserLoginLoading] = useState(false);
  const [isDevLoginLoading, setIsDevLoginLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const handleLogoutFirst = async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }
    // Clear any previous impersonation state
    localStorage.removeItem('impersonatedUser');
  }

  const handleUserLogin = async () => {
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter both email and password.',
      });
      return;
    }

    setIsUserLoginLoading(true);
    try {
      // Always sign out first to ensure a clean session.
      await handleLogoutFirst();
      await initiateEmailSignIn(auth, email, password);
      // Set the impersonation flag AFTER successful login
      localStorage.setItem('impersonatedUser', email);
      toast({
        title: 'Login Successful',
        description: `Now logged in as ${email}.`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsUserLoginLoading(false);
    }
  };

  const handleDeveloperLogin = async () => {
    setIsDevLoginLoading(true);
    try {
      // Always sign out first to ensure a clean session.
      await handleLogoutFirst();
      await initiateAnonymousSignIn(auth);
      toast({
        title: 'Developer Login',
        description: 'You are now logged in as a developer.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Developer login failed:', error);
      toast({
        variant: 'destructive',
        title: 'Developer Login Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsDevLoginLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4"
      style={{ backgroundImage: "url('/safeviate-background.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-slate-950/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.22),transparent_28%)]" />

      <Card className="relative w-full max-w-md border-white/20 bg-white/10 shadow-2xl backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-white">Welcome to Safeviate</CardTitle>
          <CardDescription className="text-center text-white/85">Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="block text-center text-white">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@safeviate.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isUserLoginLoading || isDevLoginLoading}
              className="bg-white/90"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="block text-center text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isUserLoginLoading || isDevLoginLoading}
              className="bg-white/90"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleUserLogin} disabled={isUserLoginLoading || isDevLoginLoading}>
            {isUserLoginLoading ? 'Logging in...' : 'Login as User'}
          </Button>

          <div className="relative w-full">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>

          <Button variant="outline" className="w-full bg-white/80" onClick={handleDeveloperLogin} disabled={isUserLoginLoading || isDevLoginLoading}>
            {isDevLoginLoading ? 'Logging in...' : 'Login as Developer'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
