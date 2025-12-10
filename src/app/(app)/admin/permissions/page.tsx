
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

export default function PermissionsPage() {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Permissions</CardTitle>
        <CardDescription>
          A read-only review of all granular permissions available in the system, defined in the code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Permission ID</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {permissionsConfig.map(resource => (
                    resource.actions.map((action, index) => {
                        const permissionId = `${resource.id}-${action}`;
                        return (
                            <TableRow key={permissionId}>
                                <TableCell>
                                    {index === 0 && <Badge variant="secondary">{resource.name}</Badge>}
                                </TableCell>
                                <TableCell><Badge variant="outline">{action}</Badge></TableCell>
                                <TableCell className="font-mono text-xs">{permissionId}</TableCell>
                            </TableRow>
                        )
                    })
                ))}
                {permissionsConfig.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">
                            No permissions configured in `src/lib/permissions-config.ts`.
                        </TableCell>
                    </TableRow>
                 )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
