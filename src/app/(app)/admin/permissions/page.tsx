'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { permissionsConfig } from '@/lib/permissions-config';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PermissionsPage() {

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 p-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Application Permissions</CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              A read-only review of all granular permissions available in the system, defined in the code.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <div className="p-0">
              <Table>
                  <TableHeader className="bg-muted/30">
                      <TableRow>
                          <TableHead className="text-[10px] uppercase font-black">Resource</TableHead>
                          <TableHead className="text-[10px] uppercase font-black">Action</TableHead>
                          <TableHead className="text-[10px] uppercase font-black">Permission ID</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {permissionsConfig.map(resource => (
                          resource.actions.map((action, index) => {
                              const permissionId = `${resource.id}-${action}`;
                              return (
                                  <TableRow key={permissionId} className="group hover:bg-muted/10 transition-colors">
                                      <TableCell className="py-3">
                                          {index === 0 && (
                                            <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-none">
                                              {resource.name}
                                            </Badge>
                                          )}
                                      </TableCell>
                                      <TableCell className="py-3">
                                        <Badge variant="outline" className="text-[10px] uppercase font-black h-5 border-muted-foreground/30">
                                          {action}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="font-mono text-[11px] text-muted-foreground py-3">
                                        {permissionId}
                                      </TableCell>
                                  </TableRow>
                              )
                          })
                      ))}
                      {permissionsConfig.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={3} className="text-center h-24 text-sm italic text-muted-foreground">
                                  No permissions configured in `src/lib/permissions-config.ts`.
                              </TableCell>
                          </TableRow>
                       )}
                  </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
