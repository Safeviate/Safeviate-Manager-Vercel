'use client';

import { PersonnelDirectoryPage } from '../personnel/personnel-directory-page';

export default function ExternalInstructorsPage() {
  return (
    <PersonnelDirectoryPage
      selectedUserType="Instructor"
      externalOnly={true}
      title="External Instructors"
      description="Manage all guest and freelance instructors."
    />
  );
}
