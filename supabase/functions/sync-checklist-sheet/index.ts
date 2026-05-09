// sync-checklist-sheet — v48
// Triggered by DB INSERT/UPDATE on checklist table via Supabase Database Webhook.
//
// STRATEGY:
//   When called by a DB webhook  → use the single `record` from the request body.
//   When called manually (no body) → fallback to query last 2 days by modified_at.
//
// The GAS upserts by task_id, so sending one row at a time is correct and fast.
// This avoids the PostgREST 1000-row default cap entirely.
//
// NOTE: Also set Supabase Dashboard → Settings → API → Max Rows = 5000
// so the fallback query works correctly if ever needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzXzqnKmbeXw3i6kySQcBOwxHQA7y8WBFfEe69MPbCR-jux0Zte7-TeSKi8P4CIFkhE/exec";

// For TIMESTAMP WITH TIME ZONE columns (submission_date, created_at) stored in UTC —
// converts to IST (UTC+5:30) and formats as DD/MM/YYYY HH:MM:SS.
const fmtUtc = (iso: string | null | undefined): string => {
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

// For TIMESTAMP WITHOUT TIME ZONE columns (task_start_date, planned_date) that are
// already stored in IST — reformat the string directly, no UTC offset applied.
// "2026-05-09 23:30:00" → "09/05/2026 23:30:00"
const fmtLocal = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    const normalized = iso.replace("T", " ").split("+")[0].split(".")[0];
    const [datePart, timePart = "00:00:00"] = normalized.split(" ");
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y} ${timePart}`;
  } catch {
    return String(iso);
  }
};

// DD/MM/YYYY only variant for planned_date (no TZ) or created_at (UTC).
const fmtLocalDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    const normalized = iso.replace("T", " ").split("+")[0].split(".")[0];
    const [datePart] = normalized.split(" ");
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return String(iso);
  }
};

const fmtUtcDate = (iso: string | null | undefined): string => {
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

// deno-lint-ignore no-explicit-any
const rowToArray = (row: any): unknown[] => [
  fmtLocal(row.task_start_date),                              // A - Timestamp (no TZ, already IST)
  row.task_id ?? "",                                           // B - Task ID
  row.department ?? "",                                        // C - Department
  row.given_by ?? "",                                          // D - Given By
  row.name ?? "",                                              // E - Name
  row.task_description ?? "",                                  // F - Task Description
  fmtLocal(row.task_start_date),                              // G - Task Start Date (no TZ, already IST)
  row.frequency ?? "",                                         // H - Freq
  row.enable_reminder ?? "",                                   // I - Enable Reminders
  row.require_attachment ?? "",                                // J - Require Attachment
  fmtUtc(row.submission_date),                                // K - Actual (UTC, convert to IST)
  row.delay ?? "",                                             // L - Delay
  row.status ?? "Pending",                                     // M - Status
  row.remark ?? "",                                            // N - Remarks
  row.image ?? "",                                             // O - Uploaded Image
  row.admin_done ?? "",                                        // P - Admin Done
  "",                                                          // Q - Buddy (GAS preserves existing value)
  row.planned_date ? fmtLocalDate(row.planned_date)           // R - Last Generated On
                   : fmtUtcDate(row.created_at),
];

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

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // deno-lint-ignore no-explicit-any
    let rows: any[];

    // Try to parse the DB webhook payload first
    let webhookRecord = null;
    try {
      const body = await req.json();
      // Supabase webhook body: { type: "INSERT"|"UPDATE", record: {...}, old_record: {...} }
      if (body?.record && body.record.task_start_date) {
        webhookRecord = body.record;
      }
    } catch {
      // Not a JSON body (e.g. manual GET trigger) — fall through to query
    }

    if (webhookRecord) {
      // Webhook path: sync only the row that triggered this call
      rows = [rowToArray(webhookRecord)];
    } else {
      // Manual/fallback path: query last 2 days by modified_at
      // NOTE: Requires Supabase max-rows ≥ 5000 (set in Dashboard → Settings → API)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 2);

      const { data, error } = await supabase
        .from("checklist")
        .select("*")
        .not("task_start_date", "is", null)
        .gte("modified_at", cutoff.toISOString())
        .order("task_start_date", { ascending: true })
        .limit(5000);

      if (error) throw error;
      rows = (data ?? []).map(rowToArray);
    }

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
      JSON.stringify({
        success: true,
        mode: webhookRecord ? "webhook" : "fallback-query",
        rowsSent: rows.length,
        gas: gasText,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
