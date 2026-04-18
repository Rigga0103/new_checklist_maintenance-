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
  console.log("Clearing existing data from unique_maintanence table...");
  const { error: clearError } = await supabase
    .from("unique_maintanence")
    .delete()
    .neq("task_id", 0);

  if (clearError) {
    console.warn(`Warning clearing table: ${clearError.message}`);
  }

  console.log("Fetching data from machine_maintenance table...");

  let allMaintenanceData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("machine_maintenance")
      .select("*")
      .range(from, to);

    if (error) {
      console.error(`Error fetching maintenance data: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      allMaintenanceData = [...allMaintenanceData, ...data];
    }

    if (!data || data.length < pageSize) {
      hasMore = false;
    }
    page++;
  }

  console.log(`Fetched ${allMaintenanceData.length} records from machine_maintenance.`);

  // Filter for unique tasks by (description + machine_name)
  // We want to keep the latest one if there are duplicates
  const uniqueMap = new Map<string, any>();

  allMaintenanceData.forEach((row) => {
    const desc = (row.task_description || "").toLowerCase().trim();
    const machine = (row.machine_name || "").toLowerCase().trim();
    const key = `${desc}|${machine}`;

    if (!key || key === "|") return;

    const existing = uniqueMap.get(key);
    if (!existing) {
      uniqueMap.set(key, row);
    } else {
      // Keep the one with the latest created_at or actual_date or task_start_date
      const existingDate = new Date(existing.created_at || existing.actual_date || existing.task_start_date || 0);
      const currentDate = new Date(row.created_at || row.actual_date || row.task_start_date || 0);
      if (currentDate > existingDate) {
        uniqueMap.set(key, row);
      }
    }
  });

  const uniqueTasks = Array.from(uniqueMap.values());
  console.log(`Identified ${uniqueTasks.length} unique maintenance tasks.`);

  const rowsToInsert = uniqueTasks.map((task) => ({
    machine_name: task.machine_name,
    task_description: task.task_description,
    name: task.doer_name,
    given_by: null, // Not present in source
    task_start_date: task.task_start_date,
    frequency: task.frequency || "daily",
    enable_reminder: normalizeYesNo(task.enable_reminder),
    require_attachment: normalizeYesNo(task.require_attachment),
    created_at: task.created_at || new Date().toISOString(),
  }));

  if (rowsToInsert.length === 0) {
    console.log("No unique maintenance tasks to migrate.");
    return;
  }

  console.log(`Inserting ${rowsToInsert.length} unique tasks into unique_maintanence table...`);

  // Insert in chunks
  const chunkSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from("unique_maintanence").insert(chunk);

    if (error) {
      console.error(`Error inserting chunk ${i / chunkSize + 1}:`, error.message);
    } else {
      insertedCount += chunk.length;
      console.log(`Inserted ${insertedCount}/${rowsToInsert.length} tasks...`);
    }
  }

  console.log("Maintenance migration complete.");
};

runMigration().catch((err) => {
  console.error("Migration failed:", err);
});
