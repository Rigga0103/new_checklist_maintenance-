import MainTaskManagement from "@/features/employeeManagement/components/MainTaskManagement";

export const metadata = {
  title: "Task Management | Rigga Checklist",
  description: "Manage your tasks",
};

export default function TaskManagementPage() {
  return (
    <div className="p-6 pt-0">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Task Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor checklists and machine maintenance across all employees.
        </p>
      </div>
      <MainTaskManagement />
    </div>
  );
}
