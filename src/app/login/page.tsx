
'use client';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { User, Code, Mail, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, initiateEmailSignIn, initiateAnonymousSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleUserLogin = () => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Auth service not available",
        });
        return;
    }
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Email and Password required",
            description: "Please enter an email and password to log in.",
        });
        return;
    }
    // Store the impersonated email in localStorage to fetch the correct profile
    localStorage.setItem('impersonatedUser', email);
    initiateEmailSignIn(auth, email, password);
    // The onAuthStateChanged listener in AuthGuard will handle the redirect.
  };
  
  const handleDeveloperLogin = () => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Auth service not available",
        });
        return;
    }
     // Clear any impersonation
    localStorage.removeItem('impersonatedUser');
    initiateAnonymousSignIn(auth);
    // The onAuthStateChanged listener in AuthGuard will handle the redirect.
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
          <CardDescription>Development Access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4">
                <div className='space-y-2'>
                    <Label htmlFor="email">User Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="email"
                            type="email"
                            placeholder="Enter user email to login"
                            className="pl-9"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                 <div className='space-y-2'>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="password"
                            type="password"
                            placeholder="Enter password"
                            className="pl-9"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
                <Button onClick={handleUserLogin} className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  Login as User
                </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <Button onClick={handleDeveloperLogin} variant="secondary" className="w-full">
              <Code className="mr-2 h-4 w-4" />
              Login as Developer
            </Button>
        </CardContent>
      </Card>
    </main>
  );
}
