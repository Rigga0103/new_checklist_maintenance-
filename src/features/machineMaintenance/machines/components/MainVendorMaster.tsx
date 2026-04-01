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
  Users,
  Phone,
  MapPin,
  Wrench,
  Briefcase,
  Package,
  Hash,
} from "lucide-react";
import { useRBAC } from "@/hooks/useRBAC";
import {
  useVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} from "../server/tanstackQuery/useVendorQueries";
import { CreateVendorDTO, Vendor } from "../../types/types";

const ITEMS_PER_PAGE = 20;

export default function MainVendorMaster() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: vendors = [], isLoading } = useVendorsQuery();
  const createMutation = useCreateVendorMutation();
  const updateMutation = useUpdateVendorMutation();
  const deleteMutation = useDeleteVendorMutation();

  const [formData, setFormData] = useState<CreateVendorDTO>({

    "Vendro Name": "",
    "Contact No": "",
    Location: "",
    "Venodr Type": "",
    "Parts Name": "",
    "Work Type": "",
    "Visiting Card": "",
    "Images If Any": "",
    "FROM LINK": "",
  });

  const { canWrite, canEdit, canDelete } = useRBAC("machines");

  // Derive unique suggestions from all vendors
  const getUniqueValues = (key: keyof Vendor) => {
    return Array.from(new Set(vendors.map(v => v[key]).filter(Boolean))).sort();
  };

  const suggestions = {

    vendorNames: getUniqueValues("Vendro Name"),
    vendorTypes: getUniqueValues("Venodr Type"),
    partsNames: getUniqueValues("Parts Name"),
    workTypes: getUniqueValues("Work Type"),
  };

  // Filter & Search
  const filteredVendors = vendors.filter((vendor) =>

    (vendor["Vendro Name"] || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.Location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor["Venodr Type"] || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor["Parts Name"] || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor["Work Type"] || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleOpenModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingId(vendor.id);
      setFormData({

        "Vendro Name": vendor["Vendro Name"] || "",
        "Contact No": vendor["Contact No"] || "",
        Location: vendor.Location || "",
        "Venodr Type": vendor["Venodr Type"] || "",
        "Parts Name": vendor["Parts Name"] || "",
        "Work Type": vendor["Work Type"] || "",
        "Visiting Card": vendor["Visiting Card"] || "",
        "Images If Any": vendor["Images If Any"] || "",
        "FROM LINK": vendor["FROM LINK"] || "",
      });
    } else {
      setEditingId(null);
      setFormData({

        "Vendro Name": "",
        "Contact No": "",
        Location: "",
        "Venodr Type": "",
        "Parts Name": "",
        "Work Type": "",
        "Visiting Card": "",
        "Images If Any": "",
        "FROM LINK": "",
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
    if (confirm("Are you sure you want to delete this vendor record?")) {
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

  return (
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Vendor Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Maintenance service providers & suppliers</p>
        </div>
        <div className="flex items-center gap-3">
          {canWrite && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Vendor
            </button>
          )}
        </div>
      </div>


      {/* Main Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">


        <div className="max-h-[63vh] overflow-y-auto relative">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-black-50/90 backdrop-blur">
              <tr className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700">

                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor Name</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor Type</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Parts Name</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Work Type</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {paginatedVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No vendor records found.
                  </td>
                </tr>
              ) : (
                paginatedVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/20 transition-colors group">

                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">
                        {vendor["Vendro Name"] || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground line-clamp-2">
                          {vendor.Location || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-white rounded border border-indigo-100 dark:border-indigo-900/30">
                        {vendor["Venodr Type"] || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">
                        {vendor["Parts Name"] || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {vendor["Work Type"] || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenModal(vendor)}
                            className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="Edit Vendor"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(vendor.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete Vendor"
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
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredVendors.length)} of {filteredVendors.length} entries
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
                      ? "bg-green-600 text-white"
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-3xl relative overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white/50 dark:bg-neutral-900/50">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {editingId ? "Update Vendor" : "Register New Vendor"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {editingId ? "Edit vendor information" : "Add vendor to master database"}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    list="vendor-names"
                    value={formData["Vendro Name"]}
                    onChange={(e) => setFormData({ ...formData, "Vendro Name": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="Enter company or vendor name"
                  />
                  <datalist id="vendor-names">
                    {suggestions.vendorNames.map((name, idx) => (
                      <option key={idx} value={name as string} />
                    ))}
                  </datalist>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Location / Address</label>
                  <textarea
                    rows={2}
                    value={formData.Location}
                    onChange={(e) => setFormData({ ...formData, Location: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm resize-none"
                    placeholder="Full address, city, state, pin code"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vendor Type</label>
                  <input
                    type="text"
                    list="vendor-types"
                    value={formData["Venodr Type"]}
                    onChange={(e) => setFormData({ ...formData, "Venodr Type": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="e.g., Electrical, Mechanical, Hardware"
                  />
                  <datalist id="vendor-types">
                    {suggestions.vendorTypes.map((type, idx) => (
                      <option key={idx} value={type as string} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Parts / Products Supplied</label>
                  <input
                    type="text"
                    list="parts-names"
                    value={formData["Parts Name"]}
                    onChange={(e) => setFormData({ ...formData, "Parts Name": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="Bearings, Motors, Tools, etc."
                  />
                  <datalist id="parts-names">
                    {suggestions.partsNames.map((part, idx) => (
                      <option key={idx} value={part as string} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Work / Service Type</label>
                  <input
                    type="text"
                    list="work-types"
                    value={formData["Work Type"]}
                    onChange={(e) => setFormData({ ...formData, "Work Type": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="Repair, Maintenance, Supply, Installation"
                  />
                  <datalist id="work-types">
                    {suggestions.workTypes.map((work, idx) => (
                      <option key={idx} value={work as string} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Contact No</label>
                  <input
                    type="text"
                    value={formData["Contact No"]}
                    onChange={(e) => setFormData({ ...formData, "Contact No": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Visiting Card Link</label>
                  <input
                    type="text"
                    value={formData["Visiting Card"]}
                    onChange={(e) => setFormData({ ...formData, "Visiting Card": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="URL to visiting card"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Images If Any</label>
                  <input
                    type="text"
                    value={formData["Images If Any"]}
                    onChange={(e) => setFormData({ ...formData, "Images If Any": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="URL to images"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">From Link</label>
                  <input
                    type="text"
                    value={formData["FROM LINK"]}
                    onChange={(e) => setFormData({ ...formData, "FROM LINK": e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="Reference link"
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
                  className="px-5 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Update Vendor" : "Add Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}