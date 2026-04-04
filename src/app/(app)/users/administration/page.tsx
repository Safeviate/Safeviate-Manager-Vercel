import { PersonnelDirectoryPage } from '../personnel/personnel-directory-page';

export default function AdministrationUsersPage() {
  return (
    <PersonnelDirectoryPage
      selectedDepartmentId="administration"
      defaultDepartmentId="administration"
      title="Administration Users"
    />
  );
}
