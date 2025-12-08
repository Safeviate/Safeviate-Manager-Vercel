'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateSafetyProtocolRecommendations } from '@/ai/flows/generate-safety-protocol-recommendations';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  incidentReports: z.string().min(20, {
    message: 'Please enter at least 20 characters of incident reports.',
  }),
});

export function GenerateRecommendationsForm() {
  const [recommendations, setRecommendations] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      incidentReports: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setRecommendations('');
    try {
      const result = await generateSafetyProtocolRecommendations(values);
      setRecommendations(result.recommendations);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate recommendations. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Powered Safety Recommendations</CardTitle>
        <CardDescription>Paste incident reports to generate protocol improvement recommendations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="incidentReports"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Reports</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Minor runway incursion by student pilot on 05/10/24. Hard landing reported on G-WXYZ...'"
                      rows={8}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              <Wand2 className="mr-2 h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate Recommendations'}
            </Button>
          </form>
        </Form>
        {(isLoading || recommendations) && (
          <Card className="bg-secondary">
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{recommendations}</p>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
