"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Package,

  Hash,
  DollarSign,
  Layers,
  Users,
  Box,
} from "lucide-react";
import { useRBAC } from "@/hooks/useRBAC";
import {
  usePartsQuery,
  useCreatePartMutation,
  useUpdatePartMutation,
  useDeletePartMutation,
} from "../server/tanstackQuery/usePartQueries";
import { CreatePartDTO, Part } from "../../types/types";

const ITEMS_PER_PAGE = 20;

export default function MainPartMaster() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: parts = [], isLoading } = usePartsQuery();
  const createMutation = useCreatePartMutation();
  const updateMutation = useUpdatePartMutation();
  const deleteMutation = useDeletePartMutation();

  const [formData, setFormData] = useState<CreatePartDTO>({
    "VENDOR CODE": "",
    "ITEM NAME": "",
    "DATE OF PURCHASE": "",
    RATE: "",
    QTY: "",
    UNIT: "Pcs",
    "VENDOR NAME": "",
  });

  const { canWrite, canEdit, canDelete } = useRBAC("machines");

  // Filter & Search
  const filteredParts = parts.filter((part) =>
    (part["VENDOR CODE"] || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part["ITEM NAME"] || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredParts.length / ITEMS_PER_PAGE);
  const paginatedParts = filteredParts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleOpenModal = (part?: Part) => {
    if (part) {
      setEditingId(part.id);
      setFormData({
        "VENDOR CODE": part["VENDOR CODE"] || "",
        "ITEM NAME": part["ITEM NAME"] || "",
        "DATE OF PURCHASE": part["DATE OF PURCHASE"] || "",
        RATE: part.RATE || "",
        QTY: part.QTY || "",
        UNIT: part.UNIT || "Pcs",
        "VENDOR NAME": part["VENDOR NAME"] || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        "VENDOR CODE": "",
        "ITEM NAME": "",
        "DATE OF PURCHASE": "",
        RATE: "",
        QTY: "",
        UNIT: "Pcs",
        "VENDOR NAME": "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, updates: formData },
        { onSuccess: handleCloseModal }
      );
    } else {
      createMutation.mutate(formData, { onSuccess: handleCloseModal });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this item record?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Helper function to safely format rate
  const formatRate = (rate: string | number | null | undefined): string => {
    if (!rate) return "-";
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    if (isNaN(numRate)) return "-";
    return `${numRate.toFixed(2)}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Part Master</h1>
          <p className="text-sm text-muted-foreground mt-1">Registry of all spare parts and inventory items</p>
        </div>
        <div className="flex items-center gap-3">
          {canWrite && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add New Part
            </button>
          )}
        </div>
      </div>


      {/* Main Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor Code</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Item Name</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Purchase</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {paginatedParts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No item records found.
                  </td>
                </tr>
              ) : (
                paginatedParts.map((part) => (
                  <tr key={part.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground font-mono">
                          {part["VENDOR CODE"] || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        {part["ITEM NAME"] || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">

                        <span className="text-sm text-foreground">
                          {part["DATE OF PURCHASE"] || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">

                        <span className="text-sm text-foreground font-medium">
                          {formatRate(part.RATE)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">
                        {part.QTY || "0"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">

                        <span className="text-sm text-foreground">
                          {part.UNIT || "Pcs"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenModal(part)}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Edit Item"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(part.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredParts.length)} of {filteredParts.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-30 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${currentPage === pageNum
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-30 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-2xl relative overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white/50 dark:bg-neutral-900/50">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {editingId ? "Update Item Details" : "New Inventory Entry"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {editingId ? "Edit existing item record" : "Register new part to the inventory master"}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vendor Code</label>
                  <input
                    type="text"
                    value={formData["VENDOR CODE"] || ""}
                    onChange={(e) => setFormData({ ...formData, "VENDOR CODE": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="e.g. SUP-001"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData["ITEM NAME"] || ""}
                    onChange={(e) => setFormData({ ...formData, "ITEM NAME": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="e.g. V-Belt A42"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Date of Purchase</label>
                  <input
                    type="date"
                    value={formData["DATE OF PURCHASE"] || ""}
                    onChange={(e) => setFormData({ ...formData, "DATE OF PURCHASE": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Rate / Price</label>
                  <div className="relative">

                    <input
                      type="number"
                      step="0.01"
                      value={formData.RATE || ""}
                      onChange={(e) => setFormData({ ...formData, RATE: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.QTY || ""}
                    onChange={(e) => setFormData({ ...formData, QTY: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Unit</label>
                  <select
                    value={formData.UNIT || "Pcs"}
                    onChange={(e) => setFormData({ ...formData, UNIT: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Set">Set</option>
                    <option value="Ltr">Liter (Ltr)</option>
                    <option value="Kg">Kilogram (Kg)</option>
                    <option value="Box">Box</option>
                    <option value="Mtr">Meter (Mtr)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={formData["VENDOR NAME"] || ""}
                    onChange={(e) => setFormData({ ...formData, "VENDOR NAME": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="e.g. Acme Industrial"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Update Item" : "Register Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}