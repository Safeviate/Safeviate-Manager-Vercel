import { PersonnelDirectoryPage } from '../../personnel-directory-page';

type DepartmentPageProps = {
  params: {
    departmentId: string;
  };
};

export default function DepartmentPersonnelPage({ params }: DepartmentPageProps) {
  const { departmentId } = params;
  return <PersonnelDirectoryPage selectedDepartmentId={departmentId} defaultDepartmentId={departmentId} title="Department Users" />;
}
