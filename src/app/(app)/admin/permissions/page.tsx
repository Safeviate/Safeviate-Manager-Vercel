
'use client';

import { useMemo } from 'react';
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

type Permission = {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
};

export default function PermissionsPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate'; // Hardcoded for now

    const permissionsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'permissions')) : null),
        [firestore, tenantId]
    );
    const { data: permissions, isLoading } = useCollection<Permission>(permissionsQuery);

    const groupedPermissions = useMemo(() => {
        if (!permissions) return [];
        return permissions.reduce((acc, p) => {
            const resource = p.resource || 'general';
            if (!acc[resource]) {
                acc[resource] = [];
            }
            acc[resource].push(p);
            return acc;
        }, {} as Record<string, Permission[]>);
    }, [permissions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Permissions</CardTitle>
        <CardDescription>
          Review of all granular permissions available in the system. These are assigned to roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Permission Name</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Permission ID</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">Loading permissions...</TableCell>
                    </TableRow>
                )}
                {!isLoading && permissions && Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <React.Fragment key={resource}>
                        {perms.map(p => (
                             <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell><Badge variant="secondary">{p.resource}</Badge></TableCell>
                                <TableCell><Badge variant="outline">{p.action}</Badge></TableCell>
                                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                ))}
                 {!isLoading && !permissions?.length && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                            No permissions found. Have you seeded the database?
                        </TableCell>
                    </TableRow>
                 )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
