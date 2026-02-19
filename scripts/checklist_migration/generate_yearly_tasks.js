/**
 * generate_yearly_tasks.js
 *
 * Reads all 352 checklist "template" rows from Supabase,
 * then generates recurring instances for a full year
 * (from 2026-02-20 to 2027-02-19) based on each task's frequency.
 *
 * Frequency rules:
 *  - daily      → one instance per day (skip Sundays as rest day)
 *  - weekly     → one instance per week, on the SAME day-of-week as original task_start_date
 *  - fortnightly → one instance every 14 days
 *  - monthly    → one instance per month, on the SAME day-of-month as original task_start_date
 *  - quarterly  → one instance every 3 months (same day-of-month)
 *  - yearly     → one instance per year (same day-of-month)
 *
 * The original 352 rows (today = 2026-02-19) are kept as-is.
 * This script inserts NEW rows for all future occurrences starting 2026-02-20.
 *
 * Run: node generate_yearly_tasks.js
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generation window: day after today → 1 year from today
const START_DATE = new Date("2026-02-20T00:00:00"); // day after migration date
const END_DATE = new Date("2027-02-19T23:59:59"); // 1 year later

// Sunday = 0 (skip Sundays for daily tasks)
const SKIP_SUNDAYS = true;

function isSunday(date) {
  return date.getDay() === 0;
}

/**
 * Generate all dates for a given frequency, starting from the original task_start_date,
 * but only within [START_DATE, END_DATE].
 */
function generateDates(originalDate, frequency) {
  const dates = [];
  const orig = new Date(originalDate);

  switch (frequency.toLowerCase()) {
    case "daily": {
      const cur = new Date(START_DATE);
      cur.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
      while (cur <= END_DATE) {
        if (!SKIP_SUNDAYS || !isSunday(cur)) {
          dates.push(new Date(cur));
        }
        cur.setDate(cur.getDate() + 1);
      }
      break;
    }

    case "weekly": {
      // Find the first occurrence of the same weekday >= START_DATE
      const targetDow = orig.getDay(); // 0=Sun, 1=Mon ... 6=Sat
      const cur = new Date(START_DATE);
      cur.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
      // Advance to the right weekday
      while (cur.getDay() !== targetDow) {
        cur.setDate(cur.getDate() + 1);
      }
      while (cur <= END_DATE) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 7);
      }
      break;
    }

    case "fortnightly": {
      const cur = new Date(START_DATE);
      cur.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
      while (cur <= END_DATE) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 14);
      }
      break;
    }

    case "monthly": {
      const targetDay = orig.getDate(); // 1-31
      const cur = new Date(START_DATE);
      cur.setDate(1);
      cur.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
      while (cur <= END_DATE) {
        // Set to targetDay of current month (clamp to last day of month)
        const maxDay = new Date(
          cur.getFullYear(),
          cur.getMonth() + 1,
          0,
        ).getDate();
        const day = Math.min(targetDay, maxDay);
        const candidate = new Date(
          cur.getFullYear(),
          cur.getMonth(),
          day,
          orig.getHours(),
          orig.getMinutes(),
          orig.getSeconds(),
        );
        if (candidate >= START_DATE && candidate <= END_DATE) {
          dates.push(candidate);
        }
        cur.setMonth(cur.getMonth() + 1);
      }
      break;
    }

    case "quarterly": {
      const targetDay = orig.getDate();
      const cur = new Date(START_DATE);
      cur.setDate(1);
      cur.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
      while (cur <= END_DATE) {
        const maxDay = new Date(
          cur.getFullYear(),
          cur.getMonth() + 1,
          0,
        ).getDate();
        const day = Math.min(targetDay, maxDay);
        const candidate = new Date(
          cur.getFullYear(),
          cur.getMonth(),
          day,
          orig.getHours(),
          orig.getMinutes(),
          orig.getSeconds(),
        );
        if (candidate >= START_DATE && candidate <= END_DATE) {
          dates.push(candidate);
        }
        cur.setMonth(cur.getMonth() + 3);
      }
      break;
    }

    case "yearly": {
      const targetDay = orig.getDate();
      const targetMonth = orig.getMonth();
      for (
        let year = START_DATE.getFullYear();
        year <= END_DATE.getFullYear();
        year++
      ) {
        const maxDay = new Date(year, targetMonth + 1, 0).getDate();
        const day = Math.min(targetDay, maxDay);
        const candidate = new Date(
          year,
          targetMonth,
          day,
          orig.getHours(),
          orig.getMinutes(),
          orig.getSeconds(),
        );
        if (candidate >= START_DATE && candidate <= END_DATE) {
          dates.push(candidate);
        }
      }
      break;
    }

    default:
      console.warn(`Unknown frequency: ${frequency}`);
      break;
  }

  return dates;
}

function toSupabaseTimestamp(date) {
  // Format: "YYYY-MM-DD HH:MM:SS"
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function main() {
  console.log("=== Yearly Checklist Task Generator ===");
  console.log(
    `Window: ${START_DATE.toISOString().split("T")[0]} → ${END_DATE.toISOString().split("T")[0]}`,
  );

  // 1. Fetch all template tasks (all 352 rows currently in DB represent today's instances)
  console.log("\nFetching templates from Supabase...");
  const { data: templates, error: fetchError } = await supabase
    .from("checklist")
    .select("*")
    .order("task_id", { ascending: true });

  if (fetchError) {
    console.error("Error fetching templates:", fetchError);
    process.exit(1);
  }

  console.log(`Fetched ${templates.length} template tasks.`);

  // 2. Generate all future instances
  const allInserts = [];

  for (const template of templates) {
    if (!template.frequency || !template.task_start_date) continue;

    const dates = generateDates(template.task_start_date, template.frequency);

    for (const date of dates) {
      // Build a new row — copy all fields except task_id, created_at, submission_date, status, remark, image, admin_done, next_extend_date
      allInserts.push({
        department: template.department,
        given_by: template.given_by,
        name: template.name,
        task_description: template.task_description,
        enable_reminder: template.enable_reminder,
        require_attachment: template.require_attachment,
        frequency: template.frequency,
        remark: null,
        status: "pending",
        image: null,
        admin_done: null,
        delay: null,
        planned_date: null,
        created_at: new Date().toISOString(),
        task_start_date: toSupabaseTimestamp(date),
        submission_date: null,
        next_extend_date: null,
      });
    }
  }

  console.log(`\nTotal new instances to insert: ${allInserts.length}`);

  if (allInserts.length === 0) {
    console.log("Nothing to insert. Exiting.");
    return;
  }

  // 3. Insert in batches of 500
  const BATCH_SIZE = 500;
  let inserted = 0;
  let batchNum = 0;

  for (let i = 0; i < allInserts.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = allInserts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("checklist").insert(batch);

    if (error) {
      console.error(`Error on batch ${batchNum}:`, error.message);
      console.error("Stopping. Already inserted:", inserted);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(
      `Batch ${batchNum}: inserted ${batch.length} rows (total: ${inserted}/${allInserts.length})`,
    );
  }

  console.log(`\n✅ Done! Inserted ${inserted} recurring task instances.`);
  console.log(`📊 Total in checklist table: ${352 + inserted} rows`);
}

main().catch(console.error);
