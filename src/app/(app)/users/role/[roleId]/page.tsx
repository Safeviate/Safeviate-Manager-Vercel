import { PersonnelDirectoryPage } from '../../personnel/personnel-directory-page';

type RoleUsersPageProps = {
  params: {
    roleId: string;
  };
};

export default function RoleUsersPage({ params }: RoleUsersPageProps) {
  const { roleId } = params;

  return (
    <PersonnelDirectoryPage
      selectedRoleId={roleId}
      defaultRoleId={roleId}
      title="Role Users"
    />
  );
}
