'use client';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, initiateEmailSignIn, initiateAnonymousSignIn } from '@/firebase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = () => {
    initiateEmailSignIn(auth, email, password);
    router.push('/dashboard');
  };

  const handleGuestSignIn = () => {
    initiateAnonymousSignIn(auth);
    router.push('/dashboard');
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          data-ai-hint={bgImage.imageHint}
          fill
          className="-z-10 object-cover opacity-50"
        />
      )}
      <Card className="w-full max-w-sm shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Safeviate Manager</CardTitle>
          <CardDescription>Sign in to access the aviation academy dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="manager@safeviate.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleSignIn} className="w-full">
              Sign In
            </Button>
            <Button variant="secondary" className="w-full" onClick={handleGuestSignIn}>
              Continue as Guest
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
