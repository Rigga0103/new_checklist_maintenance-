"use client";

import { useState, useEffect } from "react";
import { Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createRepairRequest } from "../server/api/repairingApi";
import { useActiveMachinesQuery } from "../../machines/server/tanstackQuery/useMachineQueries";
import supabase from "@/utils/supabaseClient";

interface User {
  user_name: string;
}

export default function MainRepairRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [users, setUsers] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    formFilledBy: "",
    assignedTo: "",
    machineName: "",
    customMachine: "",
    issueDetail: "",
  });

  // Load current user
  useEffect(() => {
    const username = localStorage.getItem("user-name");
    if (username) {
      setFormData((prev) => ({ ...prev, formFilledBy: username }));
    }
  }, []);

  // Load users for assignment dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("user_name")
          .eq("status", "active");

        if (!error && data) {
          const userNames = data
            .map((u: User) => u.user_name)
            .filter(Boolean)
            .sort();
          setUsers(userNames);
        }
      } catch (err) {
        console.error("Error loading users:", err);
      }
    };

    loadUsers();
  }, []);

  // Fetch machines from master table
  const { data: machinesData = [] } = useActiveMachinesQuery();
  const machines = machinesData.map((m) => m.machine_name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.assignedTo || !formData.issueDetail) {
      alert("Please fill in all required fields");
      return;
    }

    const machineName = formData.customMachine || formData.machineName;
    if (!machineName) {
      alert("Please select or enter a machine name");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const result = await createRepairRequest({
        formFilledBy: formData.formFilledBy,
        assignedTo: formData.assignedTo,
        machineName: machineName,
        issueDetail: formData.issueDetail,
      });

      if (result) {
        setSubmitStatus("success");
        // Reset form except formFilledBy
        setFormData((prev) => ({
          ...prev,
          assignedTo: "",
          machineName: "",
          customMachine: "",
          issueDetail: "",
        }));

        // Reset status after 3 seconds
        setTimeout(() => setSubmitStatus("idle"), 3000);
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting repair request:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            New Repair Request
          </h1>
          <p className="text-muted-foreground">
            Submit a repair request for a machine. The request will be assigned
            for processing.
          </p>
        </div>

        {/* Success/Error Message */}
        {submitStatus === "success" && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300">
              Repair request submitted successfully!
            </p>
          </div>
        )}

        {submitStatus === "error" && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">
              Failed to submit repair request. Please try again.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form Filled By */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Request By
            </label>
            <input
              type="text"
              value={formData.formFilledBy}
              readOnly
              className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground cursor-not-allowed"
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Assign To <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="">Select person</option>
              {users.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          {/* Machine Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Machine Name <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.machineName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  machineName: e.target.value,
                  customMachine:
                    e.target.value === "other" ? prev.customMachine : "",
                }))
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select machine</option>
              {machines.map((machine) => (
                <option key={machine} value={machine}>
                  {machine}
                </option>
              ))}
              <option value="other">Other (Enter manually)</option>
            </select>
          </div>

          {/* Custom Machine Name */}
          {formData.machineName === "other" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Enter Machine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customMachine}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customMachine: e.target.value,
                  }))
                }
                placeholder="Enter machine name or serial number"
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          )}

          {/* Issue Detail */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Issue Details <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.issueDetail}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  issueDetail: e.target.value,
                }))
              }
              rows={4}
              placeholder="Describe the issue in detail..."
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
