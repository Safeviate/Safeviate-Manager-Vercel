'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { summarizeMaintenanceLogs } from '@/ai/flows/summarize-maintenance-logs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  maintenanceLogs: z.string().min(20, {
    message: 'Please enter at least 20 characters of maintenance logs.',
  }),
});

export function SummarizeLogsForm() {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maintenanceLogs: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setSummary('');
    try {
      const result = await summarizeMaintenanceLogs(values);
      setSummary(result.summary);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate summary. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Powered Log Summary</CardTitle>
        <CardDescription>Paste recent maintenance logs to get a summary of recurring issues and priorities.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="maintenanceLogs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Logs</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Aircraft G-ABCD: Replaced faulty altimeter. Aircraft G-EFGH: Routine 100-hour inspection completed...'"
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
              {isLoading ? 'Generating...' : 'Generate Summary'}
            </Button>
          </form>
        </Form>
        {(isLoading || summary) && (
          <Card className="bg-secondary">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{summary}</p>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
