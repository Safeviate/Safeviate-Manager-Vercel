import PageHeader from '@/components/page-header';
import { GenerateRecommendationsForm } from './generate-recommendations-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SafetyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Safety & Quality"
        description="Manage safety protocols, quality assurance, and compliance checks."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <GenerateRecommendationsForm />
        <Card>
          <CardHeader>
            <CardTitle>Compliance Checklist</CardTitle>
            <CardDescription>Status of ongoing compliance checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-5 w-4/5" />
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
