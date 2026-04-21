import { PersonnelDirectoryPage } from '../../personnel-directory-page';

type DepartmentPageProps = {
  params: Promise<{
    departmentId: string;
  }>;
};

export default async function DepartmentPersonnelPage({ params }: DepartmentPageProps) {
  const { departmentId } = await params;
  return <PersonnelDirectoryPage selectedDepartmentId={departmentId} defaultDepartmentId={departmentId} title="Department Users" />;
}
