'use client';

import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSeedDatabase = () => {
    try {
      const companyId = 'safeviate';
      const companyRef = doc(firestore, 'companies', companyId);

      setDocumentNonBlocking(
        companyRef,
        {
          id: companyId,
          name: 'Safeviate',
        },
        { merge: true }
      );

      toast({
        title: 'Database Seeding Initiated',
        description: 'The "Safeviate" company document is being created.',
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description:
          e.message || 'There was a problem seeding the database.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Setup</CardTitle>
        <CardDescription>
          Create the initial company document required for the application to
          function correctly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSeedDatabase}>Create "Safeviate" Company</Button>
      </CardContent>
    </Card>
  );
}
