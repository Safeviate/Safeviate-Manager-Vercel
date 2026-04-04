'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const getLoginErrorMessage = (errorMessage?: string) => {
    if (!errorMessage) return 'Incorrect email or password.';
    if (errorMessage === 'CredentialsSignin') {
      return 'Login failed. Check email/password, and ensure AUTH_SEED_EMAIL + AUTH_SEED_PASSWORD are set in local .env.local.';
    }
    return errorMessage;
  };

  const handleUserLogin = async () => {
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter both email and password.',
      });
      return;
    }

    setIsLoginLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Login Successful',
        description: `Welcome back to Safeviate.`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: getLoginErrorMessage(error?.message),
      });
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1597571063304-81f081944ee8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-slate-950/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.22),transparent_28%)]" />

      <Card className="relative w-full max-w-md border-white/20 bg-white/10 shadow-2xl backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-white">Safeviate Manager</CardTitle>
          <CardDescription className="text-center text-white">Secure access to organization portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="block text-center text-white">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoginLoading}
              className="bg-white/90 font-bold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="block text-center text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoginLoading}
              className="bg-white/90 font-bold"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full h-11 text-base font-black uppercase tracking-tight" onClick={handleUserLogin} disabled={isLoginLoading}>
            {isLoginLoading ? 'Authorizing...' : 'Sign In'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
