import { PersonnelDirectoryPage } from '../personnel/personnel-directory-page';

export default function TrainingUsersPage() {
  return (
    <PersonnelDirectoryPage
      selectedDepartmentId="training"
      defaultDepartmentId="training"
      title="Training Users"
    />
  );
}
