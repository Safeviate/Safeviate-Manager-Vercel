'use client';

import { useSearchParams } from 'next/navigation';
import { PersonnelDirectoryPage } from './personnel-directory-page';

export type {
  Personnel,
  PilotProfile,
  UserAccessOverrides,
} from './personnel-directory-page';

export default function UsersPersonnelPage() {
  const searchParams = useSearchParams();
  const selectedDepartmentId = searchParams?.get('department') ?? null;
  const selectedRoleId = searchParams?.get('role') ?? null;
  return (
    <PersonnelDirectoryPage
      title="All Users"
      selectedDepartmentId={selectedDepartmentId}
      selectedRoleId={selectedRoleId}
    />
  );
}
