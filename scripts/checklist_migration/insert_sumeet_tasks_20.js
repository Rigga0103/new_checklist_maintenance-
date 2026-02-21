const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rawTasks = `77	Owner	MD Sir	Sumeet Kukreja	4 am work	22/07/2025 04:00:00	daily	Yes	No
78	Owner	MD Sir	Sumeet Kukreja	Book Reading	22/07/2025 05:00:00	daily	Yes	No
79	Owner	MD Sir	Sumeet Kukreja	Daily Feed Ants	22/07/2025 05:00:00	daily	Yes	No
80	Owner	MD Sir	Sumeet Kukreja	Feed Birds Daily	22/07/2025 05:00:00	daily	Yes	No
81	Owner	MD Sir	Sumeet Kukreja	Maditation 1 Hour	22/07/2025 04:00:00	daily	Yes	No
82	Owner	MD Sir	Sumeet Kukreja	Neem Tree Water Daily	22/07/2025 05:00:00	daily	Yes	No
83	Owner	MD Sir	Sumeet Kukreja	R-A Magic	22/07/2025 05:30:00	daily	Yes	No
84	Owner	MD Sir	Sumeet Kukreja	S - 30 - M.D.O	22/07/2025 09:00:00	daily	Yes	No
85	Owner	MD Sir	Sumeet Kukreja	Signature 100 - 125 Times Sumeet Kukreja	22/07/2025 05:30:00	daily	Yes	No
86	Owner	MD Sir	Sumeet Kukreja	Surya Namaskar	22/07/2025 04:00:00	daily	Yes	No
87	Owner	MD Sir	Sumeet Kukreja	Tuesday Magic	22/07/2025 06:00:00	weekly	Yes	No
88	Owner	MD Sir	Sumeet Kukreja	Wake Up	22/07/2025 03:30:00	daily	Yes	No
257	Owner	MD Sir	Sumeet Kukreja	Revanta a/c’s	20/09/2025 18:00:00	weekly	Yes	No
306	Owner	MD Sir	Sumeet Kukreja	fast tag balance recharge 3rd of every month	03/11/2025 21:00:00	monthly	Yes	No
307	Owner	MD Sir	Sumeet Kukreja	mob recharge-7240999991	07/02/2026 21:00:00	yearly	Yes	No
308	Owner	MD Sir	Sumeet Kukreja	mob recharge-9926186000	20/11/2025 21:00:00	monthly	Yes	No
309	Owner	MD Sir	Sumeet Kukreja	mob recharge-9285040001	05/05/2026 21:00:00	yearly	Yes	No
310	Owner	MD Sir	Sumeet Kukreja	A.M.C. renewal(atlus copco)	01/11/2025 21:00:00	monthly	Yes	No
311	Owner	MD Sir	Sumeet Kukreja	15th home airtel bill payment	15/11/2025 21:00:00	monthly	Yes	No
312	Owner	MD Sir	Sumeet Kukreja	20th home electricity bill payment	20/11/2025 21:00:00	monthly	Yes	No`;

const START_DATE = new Date("2026-02-20T00:00:00");
const END_DATE = new Date("2027-02-19T23:59:59");
const SKIP_SUNDAYS = true;

function isSunday(date) {
  return date.getDay() === 0;
}

function generateDates(originalDateString, frequency) {
  const dates = [];
  const orig = new Date(originalDateString);

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
      const targetDow = orig.getDay();
      const cur = new Date(START_DATE);
      cur.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
      while (cur.getDay() !== targetDow) {
        cur.setDate(cur.getDate() + 1);
      }
      while (cur <= END_DATE) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 7);
      }
      break;
    }

    case "monthly": {
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
        cur.setMonth(cur.getMonth() + 1);
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
  }

  return dates;
}

function toSupabaseTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function run() {
  const tasksToInsert = [];

  const lines = rawTasks.split("\n");
  for (const l of lines) {
    if (!l.trim()) continue;
    const p = l.split("\t");

    // p[5] is like 22/07/2025 04:00:00
    const dateParts = p[5].split(" ");
    const cal = dateParts[0].split("/");
    const isoLike = `${cal[2]}-${cal[1]}-${cal[0]}T${dateParts[1]}`; // YYYY-MM-DDTHH:mm:ss

    tasksToInsert.push({
      department: p[1].trim(),
      given_by: p[2].trim(),
      name: p[3].trim(),
      task_description: p[4].trim(),
      task_start_date: isoLike, // keep the proper format
      frequency: p[6].trim().toLowerCase(),
      require_attachment: p[7].trim().toLowerCase(),
      enable_reminder: p[8].trim().toLowerCase(),
      status: "pending",
    });
  }

  console.log("Inserting base templates...");

  // Convert task_start_date from isoLike to string format for postgres safely
  const baseTemplates = tasksToInsert.map((t) => ({
    ...t,
    task_start_date: t.task_start_date.replace("T", " "),
  }));

  const { data: insertedTemplates, error: insertError } = await supabase
    .from("checklist")
    .insert(baseTemplates)
    .select("*");

  if (insertError) {
    console.error("Failed inserting templates:", insertError);
    return;
  }

  console.log(
    `Inserted ${insertedTemplates.length} templates. Generating future iterations...`,
  );

  const allInserts = [];

  // Now generate future tasks correctly matching generator log
  for (const template of insertedTemplates) {
    // the template task_start_date is a postgres timestamp string "2025-07-22 04:00:00"
    // we parse it back to a standard JS date locally by adding T
    // to avoid UTC conversion shifts if we use Z
    const dates = generateDates(
      template.task_start_date.replace(" ", "T"),
      template.frequency,
    );

    for (const date of dates) {
      allInserts.push({
        department: template.department,
        given_by: template.given_by,
        name: template.name,
        task_description: template.task_description,
        enable_reminder: template.enable_reminder,
        require_attachment: template.require_attachment,
        frequency: template.frequency,
        status: "pending",
        task_start_date: toSupabaseTimestamp(date),
      });
    }
  }

  console.log(`Generated ${allInserts.length} future instances.`);

  let inserted = 0;
  while (inserted < allInserts.length) {
    const batch = allInserts.slice(inserted, inserted + 500);
    const { error } = await supabase.from("checklist").insert(batch);
    if (error) console.error("Batch insert error:", error);
    inserted += batch.length;
    console.log(`Inserted batch: ${inserted}/${allInserts.length}`);
  }

  console.log("Operation complete.");
}

run();
