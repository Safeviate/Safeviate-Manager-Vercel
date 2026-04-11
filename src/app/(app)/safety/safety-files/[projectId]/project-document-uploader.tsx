'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentUploader } from '@/components/document-uploader';
import { SAFETY_FILE_REQUIREMENTS } from '../requirements';
import type {
  SafetyFileProjectDocument,
  SafetyFileProjectDocumentSection,
} from '@/types/safety-file';

const SECTION_LABELS: Record<SafetyFileProjectDocumentSection, string> = {
  'core-pack': 'Core Pack',
  appointments: 'Appointments',
  'site-controls': 'Site Controls',
  emergency: 'Emergency',
};

export function ProjectDocumentUploader({
  onDocumentAdded,
}: {
  onDocumentAdded: (document: SafetyFileProjectDocument) => Promise<void> | void;
}) {
  const [section, setSection] = useState<SafetyFileProjectDocumentSection>('core-pack');
  const [requirementId, setRequirementId] = useState<string>('general');
  const [expirationDate, setExpirationDate] = useState('');
  const [uploadsConfigured, setUploadsConfigured] = useState<boolean | null>(null);

  const sectionRequirements = useMemo(
    () => SAFETY_FILE_REQUIREMENTS.filter((requirement) => requirement.section === section),
    [section]
  );

  useEffect(() => {
    if (
      requirementId !== 'general' &&
      !sectionRequirements.some((requirement) => requirement.id === requirementId)
    ) {
      setRequirementId('general');
    }
  }, [requirementId, sectionRequirements]);

  useEffect(() => {
    let active = true;

    const loadUploadStatus = async () => {
      try {
        const response = await fetch('/api/uploads/status', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (active) {
          setUploadsConfigured(Boolean(payload?.configured));
        }
      } catch {
        if (active) {
          setUploadsConfigured(false);
        }
      }
    };

    void loadUploadStatus();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {uploadsConfigured === false ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Uploads are not configured</AlertTitle>
          <AlertDescription>
            Add <code>BLOB_READ_WRITE_TOKEN</code> in Vercel to enable project document and photo uploads in production.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <Select value={section} onValueChange={(value) => setSection(value as SafetyFileProjectDocumentSection)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SECTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={requirementId} onValueChange={setRequirementId}>
          <SelectTrigger className="w-full md:w-[260px]">
            <SelectValue placeholder="Requirement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General document for this section</SelectItem>
            {sectionRequirements.map((requirement) => (
              <SelectItem key={requirement.id} value={requirement.id}>
                {requirement.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex w-full flex-col gap-1 md:w-[220px]">
          <label htmlFor="project-document-expiry" className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Expiry Date
          </label>
          <input
            id="project-document-expiry"
            type="date"
            value={expirationDate}
            onChange={(event) => setExpirationDate(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm leading-none"
          />
        </div>

        {uploadsConfigured === false ? (
          <Button
            type="button"
            disabled
            className="h-9 gap-2 px-4 text-[10px] font-black uppercase tracking-widest"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Uploads unavailable
          </Button>
        ) : (
          <DocumentUploader
            onDocumentUploaded={async (document) => {
              const now = new Date().toISOString();
              await onDocumentAdded({
                id: crypto.randomUUID(),
                name: document.name,
                url: document.url,
                uploadDate: document.uploadDate,
                expirationDate: expirationDate ? new Date(`${expirationDate}T12:00:00`).toISOString() : document.expirationDate,
                section,
                requirementId: requirementId === 'general' ? undefined : requirementId,
                createdAt: now,
                updatedAt: now,
              });
              setExpirationDate('');
            }}
            trigger={(open) => (
              <Button
                type="button"
                onClick={() => open()}
                className="h-9 gap-2 px-4 text-[10px] font-black uppercase tracking-widest"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Upload Project Document
              </Button>
            )}
          />
        )}
      </div>
    </div>
  );
}
