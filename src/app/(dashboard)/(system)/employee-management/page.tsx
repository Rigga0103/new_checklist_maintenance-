import { redirect } from "next/navigation";

export const metadata = {
  title: "Employee Management | Rigga Checklist",
  description: "Manage your employees",
};

export default function EmployeeManagementPage() {
  redirect("/employee-management/doer-management");
}