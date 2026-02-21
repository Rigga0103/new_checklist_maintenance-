const { createClient } = require("@supabase/supabase-js");

// Load environment variables (or just hardcode the keys for this script)
const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tasksToInsert = [
  {
    department: "Owner",
    given_by: "MD Sir",
    name: "Sumeet Kukreja",
    task_description: "Revanta a/c’s",
    task_start_date: "2025-09-20 18:00:00",
    frequency: "weekly",
    require_attachment: "yes",
    enable_reminder: "no",
    status: "pending",
  },
  {
    department: "Owner",
    given_by: "MD Sir",
    name: "Sumeet Kukreja",
    task_description: "fast tag balance recharge 3rd of every month",
    task_start_date: "2025-11-03 21:00:00",
    frequency: "monthly",
    require_attachment: "yes",
    enable_reminder: "no",
    status: "pending",
  },
  {
    department: "Owner",
    given_by: "MD Sir",
    name: "Sumeet Kukreja",
    task_description: "mob recharge-7240999991",
    task_start_date: "2026-02-07 21:00:00",
    frequency: "yearly",
    require_attachment: "yes",
    enable_reminder: "no",
    status: "pending",
  },
  {
    department: "Owner",
    given_by: "MD Sir",
    name: "Sumeet Kukreja",
    task_description: "mob recharge-9926186000",
    task_start_date: "2025-11-20 21:00:00",
    frequency: "monthly",
    require_attachment: "yes",
    enable_reminder: "no",
    status: "pending",
  },
  {
    department: "Owner",
    given_by: "MD Sir",
    name: "Sumeet Kukreja",
    task_description: "mob recharge-9285040001",
    task_start_date: "2026-05-05 21:00:00",
    frequency: "yearly",
    require_attachment: "yes",
    enable_reminder: "no",
    status: "pending",
  },
  {
    department: "Owner",
    given_by: "MD Sir",
    name: "Sumeet Kukreja",
    task_description: "A.M.C. renewal(atlus copco)",
    task_start_date: "2025-11-01 21:00:00",
    frequency: "monthly",
    require_attachment: "yes",
    enable_reminder: "no",
    status: "pending",
  },
  {
    department: "Owner",
    given_by: "MD Sir",
    name: "Sumeet Kukreja",
    task_description: "15th home airtel bill payment",
    task_start_date: "2025-11-15 21:00:00",
    frequency: "monthly",
    require_attachment: "yes",
    enable_reminder: "no",
    status: "pending",
  },
  {
    department: "Owner",
    given_by: "MD Sir",
    name: "Sumeet Kukreja",
    task_description: "20th home electricity bill payment",
    task_start_date: "2025-11-20 21:00:00",
    frequency: "monthly",
    require_attachment: "yes",
    enable_reminder: "no",
    status: "pending",
  },
];

async function generateInstancesForTemplates(templates) {
  const windowStart = new Date("2026-02-19T00:00:00Z");
  const windowEnd = new Date("2027-02-19T00:00:00Z");

  const pad = (n) => String(n).padStart(2, "0");
  const toLocalISOLike = (d) => {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  let insertions = [];

  for (const task of templates) {
    if (!task.frequency) continue;

    // Ensure parsing creates a valid local Date instance matching exactly what we fed it!
    // Given string "2025-09-20 18:00:00", we should just insert a 'T' and append 'Z' to avoid time zone drift
    // Ah wait! The user's system runs local Indian Time, meaning "2025-09-20 18:00:00" is interpreted locally by JS new Date(string)
    let currentDate = new Date(task.task_start_date.replace(" ", "T")); // "YYYY-MM-DDTHH:mm:ss" parses locally without Z!!

    while (currentDate <= windowEnd) {
      // Keep going if it's before the window, we just don't insert it.
      if (
        currentDate >= windowStart &&
        String(currentDate) !==
          String(new Date(task.task_start_date.replace(" ", "T")))
      ) {
        const newTask = { ...task };
        delete newTask.task_id;
        delete newTask.created_at;

        newTask.task_start_date = toLocalISOLike(currentDate);
        insertions.push(newTask);
      }
      // Add frequency step
      if (task.frequency === "daily") {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (task.frequency === "weekly") {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (task.frequency === "monthly") {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (task.frequency === "yearly") {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      } else {
        break; // safeguard
      }
    }
  }

  console.log(
    `Generated ${insertions.length} future instances for these 8 tasks.`,
  );
  if (insertions.length > 0) {
    let i = 0;
    while (i < insertions.length) {
      const batch = insertions.slice(i, i + 500);
      const { error } = await supabase.from("checklist").insert(batch);
      if (error) {
        console.error("Insert error:", JSON.stringify(error, null, 2));
        // Show the specific objects that failed
        console.error("Failed batch:", batch.slice(0, 2)); // Just first two to see what was wrong
      }
      i += 500;
    }
  }
}

async function run() {
  console.log("Inserting base templates...");
  const { data: insertedTemplates, error: insertError } = await supabase
    .from("checklist")
    .insert(tasksToInsert)
    .select("*"); // Get back the inserted tasks to use as templates

  if (insertError) {
    console.error(
      "Failed inserting templates:",
      JSON.stringify(insertError, null, 2),
    );
    return;
  }

  console.log(
    `Inserted ${insertedTemplates.length} templates. Generating future iterations...`,
  );
  await generateInstancesForTemplates(insertedTemplates);
  console.log("Operation complete.");
}

run();
