import MainDoerManagement from "@/features/employeeManagement/components/MainDoerManagement";

export const metadata = {
  title: "Doer Management | Rigga Checklist",
  description: "Manage your doers",
};

export default function DoerManagementPage() {
  return (
    <div className="p-6">
      <MainDoerManagement />
    </div>
  );
}
