
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { View } from 'lucide-react';

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
  inspectionSettings: AircraftInspectionWarningSettings | null;
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children ? <div className="text-lg">{children}</div> : <p className="text-lg font-semibold">{value ?? 'N/A'}</p>}
    </div>
);

const getWarningStyle = (hours: number | undefined, warnings: HourWarning[] | undefined) => {
    if (hours === undefined || !warnings) return {};

    const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);
    
    for (const warning of sortedWarnings) {
        if (hours <= warning.hours) {
            return { backgroundColor: warning.color, color: warning.foregroundColor };
        }
    }
    return {};
};


export function ViewAircraftDetails({ aircraft, inspectionSettings }: ViewAircraftDetailsProps) {
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

    const tachoTill50 = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : undefined;
    const tachoTill100 = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : undefined;

    const fiftyHourStyle = getWarningStyle(tachoTill50, inspectionSettings?.fiftyHourWarnings);
    const hundredHourStyle = getWarningStyle(tachoTill100, inspectionSettings?.oneHundredHourWarnings);
    
    const handleViewImage = (url: string) => {
        setViewingImageUrl(url);
        setIsImageViewerOpen(true);
    };

    return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{aircraft.make} {aircraft.model}</CardTitle>
              <CardDescription className="text-lg">{aircraft.tailNumber}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-base">{aircraft.type}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
            <DetailItem label="Total Frame Hours" value={aircraft.frameHours?.toFixed(1)} />
            <DetailItem label="Total Engine Hours" value={aircraft.engineHours?.toFixed(1)} />
            <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1)} />
            <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toFixed(1)} />
             <DetailItem label="Next 50hr Inspection">
                <Badge style={fiftyHourStyle} className="text-lg border-transparent">{tachoTill50?.toFixed(1) ?? 'N/A'} hrs</Badge>
            </DetailItem>
            <DetailItem label="Next 100hr Inspection">
                <Badge style={hundredHourStyle} className="text-lg border-transparent">{tachoTill100?.toFixed(1) ?? 'N/A'} hrs</Badge>
            </DetailItem>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Tracked Components</CardTitle>
            <CardDescription>A list of all life-limited or tracked components on this aircraft.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Part No.</TableHead>
                        <TableHead>Serial No.</TableHead>
                        <TableHead>TSN</TableHead>
                        <TableHead>TSO</TableHead>
                        <TableHead>Install Date</TableHead>
                        <TableHead>Hours Remaining</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(aircraft.components && aircraft.components.length > 0) ? (
                        aircraft.components.map((comp) => {
                            const hoursSinceInstall = (aircraft.currentTacho || 0) - (comp.installHours || 0);
                            const hoursRemaining = comp.maxHours ? comp.maxHours - (comp.tso || 0) - hoursSinceInstall : undefined;
                            return (
                                <TableRow key={comp.id}>
                                    <TableCell className="font-medium">{comp.name}</TableCell>
                                    <TableCell>{comp.partNumber}</TableCell>
                                    <TableCell>{comp.serialNumber}</TableCell>
                                    <TableCell>{comp.tsn?.toFixed(1)}</TableCell>
                                    <TableCell>{comp.tso?.toFixed(1)}</TableCell>
                                    <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>{hoursRemaining?.toFixed(1) ?? 'N/A'}</TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">No tracked components added.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>All documents associated with this aircraft.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {(aircraft.documents && aircraft.documents.length > 0) ? (
                          aircraft.documents.map((doc, index) => (
                              <TableRow key={index}>
                                  <TableCell className="font-medium">{doc.name}</TableCell>
                                  <TableCell>{doc.uploadDate ? format(new Date(doc.uploadDate), 'PPP') : 'N/A'}</TableCell>
                                  <TableCell className="text-right">
                                      <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url)}>
                                          <View className="mr-2 h-4 w-4" /> View
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">No documents uploaded.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl">
              <DialogHeader>
                  <DialogTitle>Document Viewer</DialogTitle>
              </DialogHeader>
              {viewingImageUrl && (
                  <div className="relative h-[80vh]">
                      <Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }}/>
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
