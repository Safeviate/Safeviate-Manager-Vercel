'use client';

import { MassBalanceTemplateForm } from '../template-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NewMassBalanceTemplatePage() {
    const tenantId = 'safeviate'; // Hardcoded for now

    return (
        <div className="space-y-6">
            <div>
                 <Button asChild variant="outline" size="sm">
                    <Link href="/assets/mass-balance">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Mass & Balance
                    </Link>
                </Button>
            </div>
            <MassBalanceTemplateForm tenantId={tenantId} />
        </div>
    );
}
