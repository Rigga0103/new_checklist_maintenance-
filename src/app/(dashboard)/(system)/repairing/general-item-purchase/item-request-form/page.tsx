"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, PlusCircle, Info, Trash2, Plus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabaseClient";
import { toast } from "sonner";

const inputClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-neutral-200 dark:border-neutral-800 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200";
const selectClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-neutral-200 dark:border-neutral-800 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200";
const labelClass =
  "block text-xs font-semibold text-muted-foreground dark:text-zinc-400 mb-1.5 uppercase tracking-wider";

interface RequestedItem {
  id: string;
  name: string;
  customName: string;
  quantity: string;
}

export default function ItemRequestFormPage() {
  const [requestedBy, setRequestedBy] = useState("");
  const [requiredFor, setRequiredFor] = useState("");
  const [requestedItems, setRequestedItems] = useState<RequestedItem[]>([
    {
      id: "1",
      name: "",
      customName: "",
      quantity: "",
    },
  ]);

  const [users, setUsers] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);

      // 1. Fetch active users with fallback
      try {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("user_name")
          .eq("status", "active")
          .order("user_name", { ascending: true });

        if (usersError) throw usersError;

        if (usersData && usersData.length > 0) {
          const fetchedUsers = usersData
            .map((u) => u.user_name)
            .filter((name): name is string => typeof name === "string" && name.trim() !== "");
          setUsers(fetchedUsers);
        } else {
          setUsers([
            "Pratap Kumar Rout",
            "Chhotu Bhaiya",
            "Kamal Sharma",
            "Rakesh Kumar Rout",
            "Other",
          ]);
        }
      } catch (err: any) {
        console.warn("Could not fetch users from database, falling back to static list:", err);
        setUsers([
          "Pratap Kumar Rout",
          "Chhotu Bhaiya",
          "Kamal Sharma",
          "Rakesh Kumar Rout",
          "Other",
        ]);
      }

      // 2. Fetch distinct item names from itemdetails with fallback
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from("itemdetails")
          .select("*")
          .not("ITEM NAME", "is", null);

        if (itemsError) throw itemsError;

        if (itemsData && itemsData.length > 0) {
          const fetchedItems = Array.from(
            new Set(
              itemsData
                .map((i: any) => i["ITEM NAME"])
                .filter((name): name is string => typeof name === "string" && name.trim() !== "")
            )
          ).sort();
          setItems(fetchedItems);
        } else {
          setItems([
            "Motor",
            "Wrench",
            "Coupling",
            "Bearing",
            "V-Belt",
            "Gearbox",
            "Industrial Oil",
          ]);
        }
      } catch (err: any) {
        console.warn("Could not fetch items from database, falling back to defaults:", err);
        setItems([
          "Motor",
          "Wrench",
          "Coupling",
          "Bearing",
          "V-Belt",
          "Gearbox",
          "Industrial Oil",
        ]);
      }

      // 3. Get logged in user name
      if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("user-name");
        if (storedUser) {
          setRequestedBy(storedUser);
        }
      }

      setIsLoading(false);
    }

    loadInitialData();
  }, []);

  const handleAddItem = () => {
    setRequestedItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        customName: "",
        quantity: "",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (requestedItems.length === 1) return;
    setRequestedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof RequestedItem, value: any) => {
    setRequestedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedBy || !requiredFor.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Validate all items
    const invalidItem = requestedItems.some((item) => {
      const name = item.name === "other" ? item.customName.trim() : item.name;
      return !name;
    });

    if (invalidItem) {
      toast.error("Please select or enter a name for all items.");
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading("Submitting purchase requests...");

      const recordsToInsert = [];

      for (const item of requestedItems) {
        recordsToInsert.push({
          item_name: item.name === "other" ? item.customName.trim() : item.name,
          requested_by: requestedBy,
          required_for: requiredFor.trim(),
          status: "Pending",
          quantity: item.quantity || null,
        });
      }

      const { error } = await supabase
        .from("General_Item_Purchase")
        .insert(recordsToInsert);

      if (error) throw error;

      toast.dismiss();
      toast.success(`Successfully submitted ${recordsToInsert.length} purchase request${recordsToInsert.length > 1 ? "s" : ""}!`);

      // Reset form
      setRequiredFor("");
      setRequestedItems([{
        id: Date.now().toString(),
        name: "",
        customName: "",
        quantity: "",
      }]);
    } catch (err: any) {
      console.error("Error inserting requests:", err);
      toast.dismiss();
      toast.error(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading request form data...
        </p>
      </div>
    );
  }

  return (
    <Card className="border border-neutral-200 dark:border-zinc-800 shadow-sm transition-all duration-300 hover:shadow-md bg-white dark:bg-zinc-900/50 max-w-4xl mx-auto overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-green-500 via-emerald-600 to-teal-500 w-full" />
      <CardHeader className="pb-4 border-b border-neutral-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">New Purchase Request</CardTitle>
            <CardDescription className="mt-0.5">
              Submit multiple purchase requests with items and quantities
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Requested By */}
          <div>
            <label className={labelClass}>Requested By *</label>
            <select
              name="requestedBy"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              required
              className={selectClass}
            >
              <option value="">Select Requester</option>
              {users.map((name, index) => (
                <option key={`user-${name}-${index}`} value={name}>
                  {name}
                </option>
              ))}
              {!users.includes(requestedBy) && requestedBy && (
                <option value={requestedBy}>{requestedBy}</option>
              )}
            </select>
          </div>

          {/* Dynamic Multiple Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-150 dark:border-zinc-800/60 pb-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Items List
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="border-green-600 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950/20 gap-1.5 py-1.5 px-3 h-8 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {requestedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 border border-neutral-150 dark:border-zinc-800/60 rounded-xl bg-neutral-50/30 dark:bg-zinc-950/10 space-y-3 relative group transition-all duration-300 hover:border-neutral-300 dark:hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full bg-neutral-200 dark:bg-zinc-800 text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Purchase Item Details
                    </span>
                    {requestedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute right-3 top-3 text-neutral-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Item Name Selection */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Item Name *</label>
                    <select
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      required
                      className={selectClass}
                    >
                      <option value="">Select Item</option>
                      {items.map((name, idx) => (
                        <option key={`item-${name}-${idx}`} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value="other">Other (Enter manually)</option>
                    </select>
                  </div>

                  {/* Custom input if other selected */}
                  {item.name === "other" && (
                    <div className="animate-in fade-in slide-in-from-left-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom Item Name *</label>
                      <input
                        type="text"
                        value={item.customName}
                        onChange={(e) => handleItemChange(item.id, "customName", e.target.value)}
                        placeholder="Type custom item name..."
                        required
                        className={inputClass}
                      />
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                      placeholder="Enter quantity"
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required For */}
          <div>
            <label className={labelClass}>Reason / Required For *</label>
            <textarea
              value={requiredFor}
              onChange={(e) => setRequiredFor(e.target.value)}
              required
              rows={3}
              placeholder="Provide a detailed explanation of why these items are required..."
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Info notice box */}
          <div className="flex gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-zinc-950/20 border border-neutral-100 dark:border-zinc-800/80 text-xs text-muted-foreground leading-normal">
            <Info className="w-4.5 h-4.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p>
              Adding multiple items will generate <strong>individual purchase requests</strong> for each item in the database with status <code>Pending</code>.
              Quantity will be saved for each request.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-zinc-800/85">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 px-5 py-2 transition-transform duration-150 active:scale-95 shadow-sm font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Requests...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4.5 h-4.5" />
                  Submit {requestedItems.length} Request{requestedItems.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}