'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
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

      <DocumentUploader
        onDocumentUploaded={async (document) => {
          const now = new Date().toISOString();
          await onDocumentAdded({
            id: crypto.randomUUID(),
            name: document.name,
            url: document.url,
            uploadDate: document.uploadDate,
            expirationDate: document.expirationDate,
            section,
            requirementId: requirementId === 'general' ? undefined : requirementId,
            createdAt: now,
            updatedAt: now,
          });
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
    </div>
  );
}
