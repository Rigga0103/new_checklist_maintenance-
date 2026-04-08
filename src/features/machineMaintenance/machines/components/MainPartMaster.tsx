"use client";

import { useState, useEffect } from "react";
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
  IndianRupee,
  Calendar,
  Box,
  Building2,
  Tag,
  Download,
  CheckSquare,
  Square,
} from "lucide-react";
import { useRBAC } from "@/hooks/useRBAC";
import {
  usePartsQuery,
  useCreatePartMutation,
  useUpdatePartMutation,
  useDeletePartMutation,
} from "../server/tanstackQuery/usePartQueries";
import { CreatePartDTO, Part } from "../../types/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ITEMS_PER_PAGE = 20;

export default function MainPartMaster() {
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "user";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const role = localStorage.getItem("role") || "user";
      if (role !== userRole) setUserRole(role);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [userRole]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

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

  // Derive unique suggestions from all parts
  const getUniqueValues = (key: keyof Part) => {
    return Array.from(new Set(parts.map(p => p[key]).filter(Boolean))).sort();
  };

  const suggestions = {
    vendorCodes: getUniqueValues("VENDOR CODE"),
    itemNames: getUniqueValues("ITEM NAME"),
    vendorNames: getUniqueValues("VENDOR NAME"),
    units: ["Pcs", "Set", "Ltr", "Kg", "Box", "Mtr"],
  };

  // Filter & Search
  const filteredParts = parts.filter((part) =>
    (part["VENDOR CODE"] || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part["ITEM NAME"] || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part["VENDOR NAME"] || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredParts.length / ITEMS_PER_PAGE);
  const paginatedParts = filteredParts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Handle row selection
  const handleSelectRow = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      const allIds = paginatedParts.map(p => p.id);
      setSelectedRows(new Set(allIds));
    }
    setSelectAll(!selectAll);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (selectedRows.size === 0) {
      alert("Please select at least one item to export");
      return;
    }

    const selectedParts = parts.filter(part => selectedRows.has(part.id));

    // Create PDF document
    const doc = new jsPDF('landscape');

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("Parts Inventory Report", 14, 15);

    // Add metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);
    doc.text(`Total Items: ${selectedParts.length}`, 14, 31);

    // Prepare table data
    const tableHeaders = [
      "S.No",
      "Item Name",
      "Vendor Name",
      "Date of Purchase",
      "Rate (₹)",
      "Quantity",
      "Unit",
      "Vendor Code"
    ];

    const tableData = selectedParts.map((part, index) => [
      index + 1,
      part["ITEM NAME"] || "-",
      part["VENDOR NAME"] || "-",
      part["DATE OF PURCHASE"] || "-",
      part.RATE ? parseFloat(part.RATE).toFixed(2) : "-",
      part.QTY || "0",
      part.UNIT || "Pcs",
      part["VENDOR CODE"] || "-",
    ]);

    // Add table to PDF
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 15 }, // S.No 
        1: { cellWidth: 50 }, // Item Name
        2: { cellWidth: 45 }, // Vendor Name
        3: { cellWidth: 30 }, // Date
        4: { cellWidth: 25 }, // Rate
        5: { cellWidth: 20 }, // Quantity
        6: { cellWidth: 20 }, // Unit
        7: { cellWidth: 35 }, // Vendor Code
      },
      margin: { left: 14, right: 14 },
    });

    // Add summary at the end
    const finalY = (doc as any).lastAutoTable.finalY || 80;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);


    // Save PDF
    doc.save(`parts-inventory-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Calculate total value of selected items
  const calculateTotalValue = (items: Part[]) => {
    return items.reduce((sum, item) => {
      const rate = item.RATE ? parseFloat(item.RATE) : 0;
      const qty = item.QTY ? parseFloat(item.QTY) : 0;
      return sum + (rate * qty);
    }, 0);
  };

  const calculateTotalQuantity = (items: Part[]) => {
    return items.reduce((sum, item) => {
      const qty = item.QTY ? parseFloat(item.QTY) : 0;
      return sum + qty;
    }, 0);
  };

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
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Part Master</h1>
          <p className="text-sm text-muted-foreground mt-1">Registry of all spare parts and inventory items</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by code, item or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm w-64"
            />
          </div>

          {/* Export Button */}
          {selectedRows.size > 0 && (
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm active:scale-95 text-sm"
            >
              <Download className="w-4 h-4" />
              Export ({selectedRows.size})
            </button>
          )}

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
          <div className="max-h-[63vh] overflow-y-auto relative">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur-sm">
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-3 text-center w-10">
                    <button
                      onClick={handleSelectAll}
                      className="text-muted-foreground hover:text-blue-600 transition-colors"
                    >
                      {selectAll && paginatedParts.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Item Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Purchase</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</th>
                  {userRole === "admin" && <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {paginatedParts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No item records found.
                    </td>
                  </tr>
                ) : (
                  paginatedParts.map((part) => (
                    <tr key={part.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/20 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleSelectRow(part.id)}
                          className="text-muted-foreground hover:text-blue-600 transition-colors"
                        >
                          {selectedRows.has(part.id) ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {part["ITEM NAME"] || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {part["VENDOR NAME"] || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {part["DATE OF PURCHASE"] || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
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
                          <Box className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {part.UNIT || "Pcs"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {userRole === "admin" && <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        </div>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

      {/* Modal Form (same as before) */}
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
                  <label className="block text-xs text-muted-foreground mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    list="item-names"
                    value={formData["ITEM NAME"]}
                    onChange={(e) => setFormData({ ...formData, "ITEM NAME": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="e.g. V-Belt A42, Bearing 6204"
                  />
                  <datalist id="item-names">
                    {suggestions.itemNames.map((name, idx) => (
                      <option key={idx} value={name as string} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Date of Purchase</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={formData["DATE OF PURCHASE"] || ""}
                      onChange={(e) => setFormData({ ...formData, "DATE OF PURCHASE": e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Rate / Price</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={formData.UNIT || "Pcs"}
                      onChange={(e) => setFormData({ ...formData, UNIT: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm appearance-none"
                    >
                      {suggestions.units.map((unit, idx) => (
                        <option key={idx} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Vendor Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      list="vendor-names"
                      value={formData["VENDOR NAME"]}
                      onChange={(e) => setFormData({ ...formData, "VENDOR NAME": e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                      placeholder="e.g. Acme Industrial"
                    />
                    <datalist id="vendor-names">
                      {suggestions.vendorNames.map((name, idx) => (
                        <option key={idx} value={name as string} />
                      ))}
                    </datalist>
                  </div>
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