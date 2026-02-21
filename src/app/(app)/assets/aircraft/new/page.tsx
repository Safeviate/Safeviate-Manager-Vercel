
'use client';

import { AircraftForm } from '../aircraft-form';

export default function NewAircraftPage() {
    const tenantId = 'safeviate'; // Hardcoded for now
    
    // The form now handles its own submission logic, so we just render it.
    return <AircraftForm tenantId={tenantId} />;
}
