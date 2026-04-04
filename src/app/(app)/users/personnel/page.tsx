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
  return (
    <PersonnelDirectoryPage
      selectedDepartmentId={searchParams.get('department')}
      selectedRoleId={searchParams.get('role')}
    />
  );
}
