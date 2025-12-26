
'use client';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { User, Code } from 'lucide-react';

export default function LoginPage() {
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');
  const router = useRouter();

  const handleLogin = () => {
    // Both logins go to the same place for now, without authentication.
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
          <CardDescription>Development Access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleLogin} className="w-full">
              <User className="mr-2 h-4 w-4" />
              Login as User
            </Button>
            <Button onClick={handleLogin} variant="secondary" className="w-full">
              <Code className="mr-2 h-4 w-4" />
              Login as Developer
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
