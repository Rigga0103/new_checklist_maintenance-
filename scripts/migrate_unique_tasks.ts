import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const normalizeYesNo = (val: string | null | undefined): "yes" | "no" => {
  if (!val) return "no";
  const lower = val.toLowerCase().trim();
  if (lower === "yes" || lower === "true" || lower === "1") return "yes";
  return "no";
};

const runMigration = async () => {
  console.log("Clearing existing data from unique_checklist table...");
  const { error: clearError } = await supabase
    .from("unique_checklist")
    .delete()
    .neq("task_id", 0); // Delete all rows where task_id != 0 (standard hack for delete all)

  if (clearError) {
    console.warn(`Warning clearing table: ${clearError.message}`);
  }

  console.log("Fetching data from checklist table...");

  let allChecklistData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("checklist")
      .select("*")
      .range(from, to);

    if (error) {
      console.error(`Error fetching checklist data: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      allChecklistData = [...allChecklistData, ...data];
    }

    if (!data || data.length < pageSize) {
      hasMore = false;
    }
    page++;
  }

  console.log(`Fetched ${allChecklistData.length} records from checklist.`);

  // Filter for unique tasks by (description + department)
  // We want to keep the latest one if there are duplicates
  const uniqueMap = new Map<string, any>();

  allChecklistData.forEach((row) => {
    const desc = (row.task_description || "").toLowerCase().trim();
    const dept = (row.department || "").toLowerCase().trim();
    const key = `${desc}|${dept}`;

    if (!key || key === "|") return;

    const existing = uniqueMap.get(key);
    if (!existing) {
      uniqueMap.set(key, row);
    } else {
      // Keep the one with the latest created_at or submission_date
      const existingDate = new Date(existing.created_at || existing.submission_date || 0);
      const currentDate = new Date(row.created_at || row.submission_date || 0);
      if (currentDate > existingDate) {
        uniqueMap.set(key, row);
      }
    }
  });

  const uniqueTasks = Array.from(uniqueMap.values());
  console.log(`Identified ${uniqueTasks.length} unique tasks.`);

  const rowsToInsert = uniqueTasks.map((task) => ({
    name: task.name,
    department: task.department,
    task_description: task.task_description,
    task_end_date: task.planned_date,
    frequency: task.frequency || "daily",
    require_attachment: normalizeYesNo(task.require_attachment),
    given_by: task.given_by,
    task_start_date: task.task_start_date,
    enable_reminder: normalizeYesNo(task.enable_reminders),
    image: task.image,
    created_at: task.created_at || new Date().toISOString(),
  }));

  if (rowsToInsert.length === 0) {
    console.log("No unique tasks to migrate.");
    return;
  }

  console.log(`Inserting ${rowsToInsert.length} unique tasks into unique_checklist table...`);

  // Insert in chunks to avoid large payload errors
  const chunkSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from("unique_checklist").insert(chunk);

    if (error) {
      console.error(`Error inserting chunk ${i / chunkSize + 1}:`, error.message);
    } else {
      insertedCount += chunk.length;
      console.log(`Inserted ${insertedCount}/${rowsToInsert.length} tasks...`);
    }
  }

  console.log("Migration complete.");
};

runMigration().catch((err) => {
  console.error("Migration failed:", err);
});
