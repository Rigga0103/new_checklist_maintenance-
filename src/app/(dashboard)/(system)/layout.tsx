import DashboardLayout from "@/components/layout/DashboardLayout";

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
