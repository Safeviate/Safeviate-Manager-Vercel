
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Info, ShieldAlert } from 'lucide-react';

export function PhasesTab() {
  return (
    <div className="space-y-6">
      <div className="px-1">
        <h2 className="text-xl font-bold">International SAR Phases</h2>
        <p className="text-sm text-muted-foreground">Standardized ICAO terminology used for Search and Rescue (SAR) notification and external escalation.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* INCERFA */}
        <Card className="border-l-4 border-l-blue-500 shadow-none border">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <Info className="h-5 w-5" /> INCERFA (Uncertainty Phase)
              </CardTitle>
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Phase 1</Badge>
            </div>
            <CardDescription className="font-medium text-blue-900/70">
              Uncertainty exists as to the safety of an aircraft and its occupants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Activation Criteria</p>
              <ul className="text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
                <li>No communication has been received from an aircraft within a period of 30 minutes after the time a communication should have been received.</li>
                <li>An aircraft fails to arrive within 30 minutes of the estimated time of arrival last notified to or estimated by air traffic services units.</li>
              </ul>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-bold text-blue-800 uppercase mb-1">Standard Action</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Initiate communication search. Verify flight plan details. Contact alternate airfields and known frequencies.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ALERFA */}
        <Card className="border-l-4 border-l-amber-500 shadow-none border">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-amber-700 flex items-center gap-2">
                <Clock className="h-5 w-5" /> ALERFA (Alert Phase)
              </CardTitle>
              <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Phase 2</Badge>
            </div>
            <CardDescription className="font-medium text-amber-900/70">
              Apprehension exists as to the safety of an aircraft and its occupants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Activation Criteria</p>
              <ul className="text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
                <li>Following the uncertainty phase, subsequent attempts to establish communication or inquiries to other relevant sources have failed to reveal any news of the aircraft.</li>
                <li>An aircraft has been cleared to land and fails to land within five minutes of the estimated time of landing and communication has not been re-established.</li>
                <li>Information is received which indicates that the operating efficiency of the aircraft has been impaired, but not to the extent that a forced landing is likely.</li>
              </ul>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs font-bold text-amber-800 uppercase mb-1">Standard Action</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Notify Search and Rescue Coordination Center (RCC). Prepare ground support. Alert internal management and staff.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* DETRESFA */}
        <Card className="border-l-4 border-l-red-500 shadow-none border">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" /> DETRESFA (Distress Phase)
              </CardTitle>
              <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Phase 3</Badge>
            </div>
            <CardDescription className="font-medium text-red-900/70">
              Reasonable certainty exists that an aircraft and its occupants are threatened by grave and imminent danger and require immediate assistance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Activation Criteria</p>
              <ul className="text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
                <li>Following the alert phase, further unsuccessful attempts to establish communication and more widespread unsuccessful inquiries point to the probability that the aircraft is in distress.</li>
                <li>The fuel on board is considered to be exhausted, or to be insufficient to enable the aircraft to reach safety.</li>
                <li>Information is received which indicates that a forced landing is likely or has been made.</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs font-bold text-red-800 uppercase mb-1">Standard Action</p>
              <p className="text-xs text-red-700 leading-relaxed">
                Activate full Emergency Response Plan. Dispatch resources. Finalize media holding statements. Contact next of kin.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
