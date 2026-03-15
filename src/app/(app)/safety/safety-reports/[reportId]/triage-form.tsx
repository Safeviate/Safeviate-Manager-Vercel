'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/types/safety-report';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save } from 'lucide-react';

const reportStatuses = ['Open', 'Under Review', 'Awaiting Action', 'Closed'];
const eventClassifications = ['Hazard', 'Incident', 'Accident'];

// ICAO Occurrence Categories (CICTT Taxonomy)
const ICAO_CATEGORIES = [
  { code: 'ADRM', description: 'Aerodrome' },
  { code: 'AMAN', description: 'Abrupt Maneuver' },
  { code: 'ARC', description: 'Abnormal Runway Contact' },
  { code: 'BIRD', description: 'Bird strike' },
  { code: 'CABIN', description: 'Cabin Safety Events' },
  { code: 'CFIT', description: 'Controlled Flight Into or Toward Terrain' },
  { code: 'CTOL', description: 'Collision with obstacle(s) during take-off and landing' },
  { code: 'EVAC', description: 'Evacuation' },
  { code: 'F-NI', description: 'Fire/smoke (non-impact)' },
  { code: 'F-POST', description: 'Fire/smoke (post-impact)' },
  { code: 'FUEL', description: 'Fuel related' },
  { code: 'GCOL', description: 'Ground Collision' },
  { code: 'GRS', description: 'Ground Handling' },
  { code: 'HIJACK', description: 'Hijacking' },
  { code: 'ICE', description: 'Icing' },
  { code: 'LOC-G', description: 'Loss of control - Ground' },
  { code: 'LOC-I', description: 'Loss of control - Inflight' },
  { code: 'MAC', description: 'Airprox/ ACAS alert/ loss of separation' },
  { code: 'NAV', description: 'Navigation error' },
  { code: 'RE', description: 'Runway Excursion' },
  { code: 'RI', description: 'Runway Incursion' },
  { code: 'SEC', description: 'Security related' },
  { code: 'SCF-NP', description: 'System/ component failure or malfunction (non-powerplant)' },
  { code: 'SCF-PP', description: 'System/ component failure or malfunction (powerplant)' },
  { code: 'TURB', description: 'Turbulence encounter' },
  { code: 'UCOL', description: 'Undershoot/ overshoot' },
  { code: 'WSTR', description: 'Windshear or thunderstorm' },
  { code: 'OTHER', description: 'Other' },
  { code: 'UNK', description: 'Unknown or undetermined' },
];

const triageSchema = z.object({
  status: z.string().min(1),
  occurrenceCategory: z.string().optional(),
  eventClassification: z.string().optional(),
});

type TriageFormValues = z.infer<typeof triageSchema>;

interface TriageFormProps {
  report: SafetyReport;
  tenantId: string;
}

export function TriageForm({ report, tenantId }: TriageFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<TriageFormValues>({
    resolver: zodResolver(triageSchema),
    defaultValues: {
      status: report.status || 'Open',
      occurrenceCategory: report.occurrenceCategory || '',
      eventClassification: report.eventClassification || '',
    },
  });

  const onSubmit = (values: TriageFormValues) => {
    if (!firestore) return;

    const reportRef = doc(
      firestore,
      'tenants',
      tenantId,
      'safety-reports',
      report.id
    );
    updateDocumentNonBlocking(reportRef, values);

    toast({
      title: 'Triage Details Saved',
      description: 'The report classification has been updated.',
    });
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-300px)] overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <CardTitle>Report Classification & Triage</CardTitle>
        <CardDescription>
          Assign, classify, and manage the report status.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Set status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reportStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventClassification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Classification</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Classify event" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventClassifications.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="occurrenceCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occurrence Category (ICAO)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <ScrollArea className="h-[300px]">
                            {ICAO_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.code} value={cat.code}>
                                {cat.code} - {cat.description}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" /> Save Triage Details
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
