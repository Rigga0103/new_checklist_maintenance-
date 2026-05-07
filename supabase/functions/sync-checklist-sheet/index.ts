// sync-checklist-sheet — v43
// Triggered by DB INSERT/UPDATE on checklist table.
// Only syncs rows that have a task_start_date (skips undated template rows).
// No date-range filter so today's tasks are always included.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzXzqnKmbeXw3i6kySQcBOwxHQA7y8WBFfEe69MPbCR-jux0Zte7-TeSKi8P4CIFkhE/exec";

// ISO → DD/MM/YYYY HH:MM:SS in IST (UTC+5:30)
const fmt = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    const p = (n: number) => n.toString().padStart(2, "0");
    return `${p(ist.getUTCDate())}/${p(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()} ${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}:${p(ist.getUTCSeconds())}`;
  } catch {
    return String(iso);
  }
};

// ISO → DD/MM/YYYY only (used for "Last Generated On" column)
const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    const p = (n: number) => n.toString().padStart(2, "0");
    return `${p(ist.getUTCDate())}/${p(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}`;
  } catch {
    return String(iso);
  }
};

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Only rows with a real task_start_date — skips undated template rows
    // No date-range filter so today's tasks are always included
    const { data, error } = await supabase
      .from("checklist")
      .select("*")
      .not("task_start_date", "is", null)
      .order("task_start_date", { ascending: true });

    if (error) throw error;

    const headers = [
      "Timestamp",          // A
      "Task ID",            // B  ← TASK_ID_COL_INDEX = 1 (0-based) in GAS
      "Department",         // C
      "Given By",           // D
      "Name",               // E
      "Task Description",   // F
      "Task Start Date",    // G
      "Freq",               // H
      "Enable Reminders",   // I
      "Require Attachment", // J
      "Actual",             // K
      "Delay",              // L
      "Status",             // M
      "Remarks",            // N
      "Uploaded Image",     // O
      "Admin Done",         // P
      "Buddy",              // Q  ← BUDDY_COL_INDEX = 16 (0-based), GAS preserves this
      "Last Generated On",  // R
    ];

    // deno-lint-ignore no-explicit-any
    const rows = (data ?? []).map((row: any) => [
      fmt(row.task_start_date),                         // A - Timestamp
      row.task_id ?? "",                                 // B - Task ID
      row.department ?? "",                              // C - Department
      row.given_by ?? "",                                // D - Given By
      row.name ?? "",                                    // E - Name
      row.task_description ?? "",                        // F - Task Description
      fmt(row.task_start_date),                         // G - Task Start Date
      row.frequency ?? "",                               // H - Freq
      row.enable_reminder ?? "",                         // I - Enable Reminders
      row.require_attachment ?? "",                      // J - Require Attachment
      fmt(row.submission_date),                         // K - Actual
      row.delay ?? "",                                   // L - Delay
      row.status ?? "Pending",                           // M - Status
      row.remark ?? "",                                  // N - Remarks
      row.image ?? "",                                   // O - Uploaded Image
      row.admin_done ?? "",                              // P - Admin Done
      "",                                                // Q - Buddy (GAS preserves existing value)
      fmtDate(row.planned_date ?? row.created_at),      // R - Last Generated On
    ]);

    const payload = {
      sheetName: "supabase_checklist_done_task",
      headers,
      rows,
    };

    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const gasText = await gasRes.text();

    return new Response(
      JSON.stringify({ success: true, rowsSent: rows.length, gas: gasText }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
