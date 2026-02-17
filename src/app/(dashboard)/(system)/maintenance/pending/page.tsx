import MaintenanceList from "@/features/checklistAndDelegation/dashboard/components/MaintenanceList";

export default function MaintenancePendingPage() {
  return <MaintenanceList initialTab="pending" showTabs={false} />;
}
