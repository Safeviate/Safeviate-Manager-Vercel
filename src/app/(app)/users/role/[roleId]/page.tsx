import { PersonnelDirectoryPage } from '../../personnel/personnel-directory-page';

type RoleUsersPageProps = {
  params: Promise<{
    roleId: string;
  }>;
};

export default async function RoleUsersPage({ params }: RoleUsersPageProps) {
  const { roleId } = await params;

  return (
    <PersonnelDirectoryPage
      selectedRoleId={roleId}
      defaultRoleId={roleId}
      title="Role Users"
    />
  );
}
