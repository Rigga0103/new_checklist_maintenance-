import MainRepairRequestForm from "@/features/machineMaintenance/repairing/components/MainRepairRequestForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repair Request | Rigga",
  description: "Submit a new repair request for a machine.",
};

export default function PublicRepairRequestPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Machine Repair Request
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Please fill out the form below to report a machine issue.
        </p>
      </div>
      <MainRepairRequestForm isPublic={true} />
    </div>
  );
}
