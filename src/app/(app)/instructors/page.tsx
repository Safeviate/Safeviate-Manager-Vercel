import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function InstructorsPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <PageHeader title="Instructor Scheduling" description="Schedule instructors and manage their availability." />
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Calendar
            mode="month"
            className="w-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}
