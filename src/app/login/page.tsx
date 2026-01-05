
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const handleLogoutFirst = async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }
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

    setIsLoading(true);
    try {
      await handleLogoutFirst();
      localStorage.setItem('impersonatedUser', email);
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Login Successful',
        description: `Now logged in as ${email}.`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      localStorage.removeItem('impersonatedUser');
      console.error('Login failed:', error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeveloperLogin = async () => {
    setIsLoading(true);
    try {
      await handleLogoutFirst();
      await signInAnonymously(auth);
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
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Safeviate</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@safeviate.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleUserLogin} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login as User'}
          </Button>

          <div className="relative w-full">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>

          <Button variant="outline" className="w-full" onClick={handleDeveloperLogin} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login as Developer'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
