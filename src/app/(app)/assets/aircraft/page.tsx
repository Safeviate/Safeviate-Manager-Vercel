
'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, Plane } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import type { Aircraft, ExternalOrganization } from '@/types/index';
import type { FeatureSettings } from '../../admin/features/page';

interface AircraftFormProps {
    tenantId: string;
    organizationId: string | null;
    existingAircraft?: Aircraft | null;
    onClose: () => void;
}

function AircraftForm({ tenantId, organizationId, existingAircraft, onClose }: AircraftFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<Aircraft>>(existingAircraft || {
        make: '', model: '', tailNumber: '', type: 'Single-Engine', currentHobbs: 0, currentTacho: 0
    });

    const handleSave = () => {
        if (!firestore) return;
        const data = { ...formData, organizationId };
        if (existingAircraft) {
            updateDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id), data);
            toast({ title: 'Aircraft Updated' });
        } else {
            addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/aircrafts`), data);
            toast({ title: 'Aircraft Created' });
        }
        onClose();
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Make</Label><Input value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} /></div>
                <div className="space-y-2"><Label>Model</Label><Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} /></div>
                <div className="space-y-2"><Label>Tail Number</Label><Input value={formData.tailNumber} onChange={e => setFormData({...formData, tailNumber: e.target.value})} /></div>
                <div className="space-y-2">
                    <Label>Type</Label>
                    <Select onValueChange={v => setFormData({...formData, type: v as any})} defaultValue={formData.type}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                            <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2"><Label>Current Hobbs</Label><Input type="number" value={formData.currentHobbs} onChange={e => setFormData({...formData, currentHobbs: parseFloat(e.target.value)})} /></div>
                <div className="space-y-2"><Label>Current Tacho</Label><Input type="number" value={formData.currentTacho} onChange={e => setFormData({...formData, currentTacho: parseFloat(e.target.value)})} /></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save Aircraft</Button>
            </DialogFooter>
        </div>
    );
}

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const canManage = hasPermission('assets-view');
  const userOrgId = userProfile?.organizationId;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const aircraftQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null), [firestore, tenantId]);
  const orgsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/external-organizations`)) : null), [firestore, tenantId]);
  const featureSettingsRef = useMemoFirebase(() => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'features') : null), [firestore, tenantId]);

  const { data: aircraft, isLoading: isLoadingAircraft } = useCollection<Aircraft>(aircraftQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);
  const { data: featureSettings, isLoading: isLoadingFeatures } = useDoc<FeatureSettings>(featureSettingsRef);

  const isLoading = isLoadingAircraft || isLoadingOrgs || isLoadingFeatures;

  const handleDelete = (id: string) => {
      if (!firestore || !tenantId) return;
      deleteDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/aircrafts`, id));
      toast({ title: 'Aircraft Deleted' });
  };

  const renderOrgContext = (orgId: string | 'internal') => {
    const contextOrgId = orgId === 'internal' ? null : orgId;
    const filteredAircraft = (aircraft || []).filter(ac => 
        orgId === 'internal' ? !ac.organizationId : ac.organizationId === orgId
    );

    return (
        <Card className="min-h-[400px] flex flex-col shadow-none border">
            <CardHeader className="bg-muted/10 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{orgId === 'internal' ? 'Internal Fleet' : organizations?.find(o => o.id === orgId)?.name}</CardTitle>
                        <CardDescription>Management of airframes and technical status.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => { setEditingAircraft(null); setIsFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tail #</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Make/Model</TableHead>
                            <TableHead className="text-right">Current Hobbs</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAircraft.length > 0 ? (
                            filteredAircraft.map(ac => (
                                <TableRow key={ac.id}>
                                    <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                                    <TableCell><Badge variant="outline">{ac.type}</Badge></TableCell>
                                    <TableCell>{ac.make} {ac.model}</TableCell>
                                    <TableCell className="text-right font-mono">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingAircraft(ac); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(ac.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No aircraft in this fleet.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-10 w-[400px] rounded-full" /><Skeleton className="h-[400px] w-full" /></div>;

  const showTabs = featureSettings?.enableExternalCompanyTabs && canManage;

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="px-1">
            <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
            <p className="text-muted-foreground">Manage aircraft assets across all operational contexts.</p>
        </div>

        {showTabs ? (
            <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
                <div className="px-1 shrink-0">
                    <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar">
                        <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Internal</TabsTrigger>
                        {(organizations || []).map(org => (
                            <TabsTrigger key={org.id} value={org.id} className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
                                {org.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                <TabsContent value="internal" className="mt-0">{renderOrgContext('internal')}</TabsContent>
                {(organizations || []).map(org => (
                    <TabsContent key={org.id} value={org.id} className="mt-0">{renderOrgContext(org.id)}</TabsContent>
                ))}
            </Tabs>
        ) : (
            renderOrgContext(userOrgId || 'internal')
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
              </DialogHeader>
              <AircraftForm 
                tenantId={tenantId!} 
                organizationId={editingAircraft?.organizationId || null} 
                existingAircraft={editingAircraft} 
                onClose={() => setIsFormOpen(false)} 
              />
          </DialogContent>
      </Dialog>
    </>
  );
}
