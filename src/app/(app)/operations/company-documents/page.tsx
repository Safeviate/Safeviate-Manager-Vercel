'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Search, Filter, Download, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CompanyDocumentsPage() {
  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Company Documents</h1>
        <p className="text-muted-foreground">Access controlled manuals, standard operating procedures, and reference materials.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search documents..." className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="text-center py-20 opacity-40">
            <FileText className="h-16 w-16 mx-auto mb-4" />
            <p className="text-lg font-medium">No documents uploaded yet.</p>
            <p className="text-sm">Controlled manuals and procedures will appear here once published by the administrator.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}