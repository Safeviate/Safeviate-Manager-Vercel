'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, Gauge, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import type { Aircraft } from '@/types/aircraft';
import type { ExternalOrganization } from '@/types/quality';
import type { TabVisibilitySettings } from '../../admin/external/page';

interface AircraftFormProps {
    tenantId: string;
    existingAircraft?: Aircraft | null;
    orgId: string | null;
    onComplete: () => void;
}

function AircraftForm({ tenantId, existingAircraft, orgId, onComplete }: AircraftFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [formData, setFormData] = useState<Partial<Aircraft>>(
        existingAircraft || {
            make: '',
            model: '',
            tailNumber: '',
            type: 'Single-Engine',
            currentHobbs: 0,
            currentTacho: 0,
            tachoAtNext50Inspection: 0,
            tachoAtNext100Inspection: 0,
        }
    );

    const handleSave = async () => {
        if (!formData.make || !formData.model || !formData.tailNumber) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please complete all required fields.' });
            return;
        }

        if (!firestore) return;

        const dataToSave = {
            ...formData,
            organizationId: orgId,
        };

        if (existingAircraft) {
            const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
            updateDocumentNonBlocking(docRef, dataToSave);
            toast({ title: 'Aircraft Updated' });
        } else {
            const colRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
            addDocumentNonBlocking(colRef, dataToSave);
            toast({ title: 'Aircraft Added' });
        }
        onComplete();
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="make">Manufacturer</Label>
                    <Input id="make" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} placeholder="e.g., Piper" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g., PA-28-181" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tail">Tail Number</Label>
                    <Input id="tail" value={formData.tailNumber} onChange={e => setFormData({ ...formData, tailNumber: e.target.value })} placeholder="e.g., ZS-FGE" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Engine Type</Label>
                    <Select onValueChange={val => setFormData({ ...formData, type: val as any })} value={formData.type}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                            <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Current Hobbs</Label>
                    <Input type="number" step="0.1" value={formData.currentHobbs} onChange={e => setFormData({ ...formData, currentHobbs: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                    <Label>Current Tacho</Label>
                    <Input type="number" step="0.1" value={formData.currentTacho} onChange={e => setFormData({ ...formData, currentTacho: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                    <Label>Next 50hr (Tacho)</Label>
                    <Input type="number" step="0.1" value={formData.tachoAtNext50Inspection} onChange={e => setFormData({ ...formData, tachoAtNext50Inspection: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                    <Label>Next 100hr (Tacho)</Label>
                    <Input type="number" step="0.1" value={formData.tachoAtNext100Inspection} onChange={e => setFormData({ ...formData, tachoAtNext100Inspection: parseFloat(e.target.value) || 0 })} />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleSave}>Save Aircraft</Button>
            </DialogFooter>
        </div>
    );
}

export default function AircraftPage() {
    const firestore = useFirestore();
    const { tenantId, userProfile } = useUserProfile();
    const { hasPermission } = usePermissions();
    const { toast } = useToast();

    const canEdit = hasPermission('assets-edit');
    const userOrgId = userProfile?.organizationId;

    const aircraftQuery = useMemoFirebase(
        () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );
    const orgsQuery = useMemoFirebase(
        () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null),
        [firestore, tenantId]
    );
    const visibilitySettingsRef = useMemoFirebase(
        () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'tab-visibility') : null),
        [firestore, tenantId]
    );

    const { data: aircraft, isLoading: isLoadingAircraft } = useCollection<Aircraft>(aircraftQuery);
    const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);
    const { data: visibilitySettings, isLoading: isLoadingVisibility } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

    const isLoading = isLoadingAircraft || isLoadingOrgs || isLoadingVisibility;

    const handleDelete = async (id: string) => {
        if (!firestore || !window.confirm('Are you sure you want to delete this aircraft?')) return;
        await deleteDoc(doc(firestore, `tenants/${tenantId}/aircrafts`, id));
        toast({ title: 'Aircraft Removed' });
    };

    const renderAircraftTable = (data: Aircraft[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Tail #</TableHead>
                    <TableHead>Make/Model</TableHead>
                    <TableHead>Current Hobbs</TableHead>
                    <TableHead>Next 50hr</TableHead>
                    <TableHead>Next 100hr</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length > 0 ? data.map(ac => (
                    <TableRow key={ac.id}>
                        <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                        <TableCell>{ac.make} {ac.model}</TableCell>
                        <TableCell className="font-mono text-xs"><Badge variant="outline" className="gap-1"><Gauge className="h-3 w-3" /> {ac.currentHobbs?.toFixed(1)}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{(ac.tachoAtNext50Inspection || 0) - (ac.currentTacho || 0)} hrs rem.</TableCell>
                        <TableCell className="font-mono text-xs">{(ac.tachoAtNext100Inspection || 0) - (ac.currentTacho || 0)} hrs rem.</TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingAircraft(ac); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(ac.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic text-sm">No aircraft found in this fleet.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    const renderOrgContext = (orgId: string | 'internal') => {
        const contextOrgId = orgId === 'internal' ? null : orgId;
        const filtered = (aircraft || []).filter(ac => orgId === 'internal' ? !ac.organizationId : ac.organizationId === orgId);

        return (
            <Card className="min-h-[400px] flex flex-col shadow-none border">
                <CardHeader className="bg-muted/10 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{orgId === 'internal' ? 'Internal Fleet' : organizations?.find(o => o.id === orgId)?.name}</CardTitle>
                            <CardDescription>Manage aircraft technical status and inspections.</CardDescription>
                        </div>
                        {canEdit && (
                            <Button onClick={() => { setEditingAircraft(null); setIsFormOpen(true); }} size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {renderAircraftTable(filtered)}
                </CardContent>
            </Card>
        );
    };

    if (isLoading) {
        return <div className="space-y-6"><Skeleton className="h-10 w-[400px] rounded-full" /><Skeleton className="h-[400px] w-full" /></div>;
    }

    const isTabEnabled = visibilitySettings?.visibilities?.['aircraft'] ?? true;
    const showTabs = isTabEnabled && hasPermission('assets-view');

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="px-1">
                <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
                <p className="text-muted-foreground">Monitor technical status and maintenance intervals for all aircraft.</p>
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

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
                        <DialogDescription>Enter technical details and inspection thresholds.</DialogDescription>
                    </DialogHeader>
                    <AircraftForm 
                        tenantId={tenantId!} 
                        existingAircraft={editingAircraft} 
                        orgId={userOrgId || null} 
                        onComplete={() => setIsFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { Separator } from '@/components/ui/separator';
