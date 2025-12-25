'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { TableTemplate } from '@/app/(app)/development/table-builder/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TableViewer } from './table-viewer';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyDashboardPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    const templatesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, `tenants/${tenantId}/table-templates`) : null),
        [firestore, tenantId]
    );
    const { data: savedTemplates, isLoading: isLoadingTemplates } = useCollection<TableTemplate>(templatesQuery);

    const selectedTemplate = useMemo(() => {
        if (!selectedTemplateId || !savedTemplates) return null;
        return savedTemplates.find(t => t.id === selectedTemplateId) || null;
    }, [selectedTemplateId, savedTemplates]);

    // Automatically select the first template if none is selected
    useState(() => {
        if (!selectedTemplateId && savedTemplates && savedTemplates.length > 0) {
            setSelectedTemplateId(savedTemplates[0].id);
        }
    });
     
    // Effect to select the first template once loaded
    useMemo(() => {
        if (!selectedTemplateId && savedTemplates && savedTemplates.length > 0) {
            setSelectedTemplateId(savedTemplates[0].id);
        }
    }, [savedTemplates, selectedTemplateId]);

    return (
        <div className="w-full space-y-6">
           <Card>
                <CardHeader>
                    <CardTitle>Table Template Viewer</CardTitle>
                    <CardDescription>Select a saved template to view it.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoadingTemplates ? (
                        <Skeleton className="h-10 w-64" />
                    ) : (
                        <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId || ''}>
                            <SelectTrigger className="w-full md:w-1/3">
                                <SelectValue placeholder="Select a template..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(savedTemplates || []).map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                        {template.name}
                                    </SelectItem>
                                ))}
                                {(savedTemplates?.length === 0) && <p className='p-4 text-sm text-muted-foreground'>No templates saved.</p>}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="mt-4 rounded-lg border p-4 min-h-[20rem] flex items-center justify-center">
                        {isLoadingTemplates ? (
                            <Skeleton className="h-64 w-full" />
                        ) : selectedTemplate ? (
                            <TableViewer tableData={selectedTemplate.tableData} />
                        ) : (
                            <p className="text-muted-foreground">Select a template to display.</p>
                        )}
                    </div>
                </CardContent>
           </Card>
        </div>
    );
}
