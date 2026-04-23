"use client";

import { useState, useMemo } from "react";
import {
  Search,
  User,
  ClipboardList,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Eye,
  Wrench,

} from "lucide-react";
import { useUsers } from "@/features/checklistAndDelegation/settings/server/tanstackQuery/useSettings";
import { SettingsTableSkeleton } from "@/features/checklistAndDelegation/settings/components/SettingsSkeleton";
import MainAssignTask from "@/features/checklistAndDelegation/assignTask/components/MainAssignTask";
import MainChecklist from "@/features/checklistAndDelegation/checklist/components/MainChecklist";
import MainMaintenancePending from "@/features/machineMaintenance/maintenance/components/MainMaintenancePending";
import MainRepairRequestForm from "@/features/machineMaintenance/repairing/components/MainRepairRequestForm";
import MainRepairingPending from "@/features/machineMaintenance/repairing/components/MainRepairingPending";

const ITEMS_PER_PAGE = 15;

export default function MainTaskManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [modalType, setModalType] = useState<
    | "assignChecklist"
    | "viewChecklist"
    | "assignMaintenance"
    | "viewMaintenance"
    | "assignRepair"
    | "viewRepair"
    | null
  >(null);

  // Data fetching
  const { data: userData = [], isLoading, refetch } = useUsers();

  // Filtered and paginated data

  const filteredUsers = useMemo(() => {
    return (userData || []).filter((user) => {
      const name = user.user_name?.toLowerCase() || "";
      const email = user.email_id?.toLowerCase() || "";
      const search = searchTerm.toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [userData, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleActionClick = (userName: string, type: typeof modalType) => {
    setSelectedUser(userName);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setModalType(null);
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">Employee Task Management</h2>
          <p className="text-sm text-muted-foreground">Assign and monitor checklist, maintenance & repair tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border-none rounded-lg focus:ring-2 focus:ring-primary w-full md:w-64"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden text-sm">
        {isLoading ? (
          <div className="p-6">
            <SettingsTableSkeleton rows={8} columns={4} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Employee</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap text-center">Checklist Actions</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap text-center">Maintenance Actions</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap text-center">Repair Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-base text-black dark:text-white">{user.user_name || "N/A"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleActionClick(user.user_name || "", "viewChecklist")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            onClick={() => handleActionClick(user.user_name || "", "assignChecklist")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 dark:bg-zinc-700 text-white rounded-lg hover:bg-black dark:hover:bg-zinc-600 transition-colors shadow-sm"
                          >
                            <Plus size={14} />
                            Assign
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleActionClick(user.user_name || "", "viewMaintenance")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700"
                          >
                            <Wrench size={14} />
                            Watch
                          </button>
                          <button
                            onClick={() => handleActionClick(user.user_name || "", "assignMaintenance")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-600 dark:bg-zinc-500 text-white rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-400 transition-colors shadow-sm"
                          >
                            <Plus size={14} />
                            Assign
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleActionClick(user.user_name || "", "viewRepair")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700"
                          >
                            <Eye size={14} />
                            Watch
                          </button>
                          <button
                            onClick={() => handleActionClick(user.user_name || "", "assignRepair")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-400 dark:bg-zinc-300 text-black rounded-lg hover:bg-zinc-500 dark:hover:bg-zinc-200 transition-colors shadow-sm font-bold"
                          >
                            <Plus size={14} />
                            Assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>No employees found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}</span> of <span className="font-medium text-foreground">{filteredUsers.length}</span> employees
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full ${modalType.startsWith('view') ? 'max-w-7xl' : 'max-w-4xl'} max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`}>
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-800 flex items-center justify-between border-b border-slate-200 dark:border-zinc-700 shrink-0">
              <div className="flex items-center gap-2">
                {modalType === 'assignChecklist' && (
                  <>
                    <Plus className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <h3 className="font-bold text-lg text-black dark:text-white">Assign Checklist Task: {selectedUser}</h3>
                  </>
                )}
                {modalType === 'viewChecklist' && (
                  <>
                    <ClipboardList className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <h3 className="font-bold text-lg text-black dark:text-white">Checklist Status: {selectedUser}</h3>
                  </>
                )}
                {modalType === 'assignMaintenance' && (
                  <>
                    <Plus className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <h3 className="font-bold text-lg text-black dark:text-white">Assign Maintenance: {selectedUser}</h3>
                  </>
                )}
                {modalType === 'viewMaintenance' && (
                  <>
                    <Wrench className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <h3 className="font-bold text-lg text-black dark:text-white">Maintenance Watch: {selectedUser}</h3>
                  </>
                )}
                {modalType === 'assignRepair' && (
                  <>
                    <Plus className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <h3 className="font-bold text-lg text-black dark:text-white">Request Repair: {selectedUser}</h3>
                  </>
                )}
                {modalType === 'viewRepair' && (
                  <>
                    <Eye className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <h3 className="font-bold text-lg text-black dark:text-white">Repair History: {selectedUser}</h3>
                  </>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors text-black dark:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {modalType === 'assignChecklist' && (
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300">
                    <p>Assigning a <strong>Checklist</strong> task to <strong>{selectedUser}</strong>.</p>
                  </div>
                  <MainAssignTask initialDoer={selectedUser || ""} initialSection="checklist" />
                </div>
              )}

              {modalType === 'viewChecklist' && (
                <div className="h-full">
                  <MainChecklist initialNameFilter={selectedUser || ""} />
                </div>
              )}

              {modalType === 'assignMaintenance' && (
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300">
                    <p>Assigning a <strong>Maintenance</strong> task to <strong>{selectedUser}</strong>.</p>
                  </div>
                  <MainAssignTask initialDoer={selectedUser || ""} initialSection="maintenance" />
                </div>
              )}

              {modalType === 'viewMaintenance' && (
                <div className="h-full">
                  <MainMaintenancePending initialDoerFilter={selectedUser || ""} />
                </div>
              )}

              {modalType === 'assignRepair' && (
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300">
                    <p>Requesting a <strong>Repair</strong> for <strong>{selectedUser}</strong>.</p>
                  </div>
                  <MainRepairRequestForm initialRequestedBy={selectedUser || ""} />
                </div>
              )}

              {modalType === 'viewRepair' && (
                <div className="h-full">
                  <MainRepairingPending initialDoerFilter={selectedUser || ""} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
