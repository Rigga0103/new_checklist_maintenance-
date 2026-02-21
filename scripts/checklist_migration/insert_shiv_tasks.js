const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rawTasks = `49	AdminOffice	MD Sir	Shivcharan Satnami	BOM check	23/07/2025 21:00:00	daily	Yes	No
50	AdminOffice	MD Sir	Shivcharan Satnami	Bilty Entry	10/07/2025 18:00:00	daily	Yes	No
51	AdminOffice	MD Sir	Shivcharan Satnami	Cash running balance 3rd of month whatsapp to sumeet sir	03/08/2025	monthly	Yes	No
52	AdminOffice	MD Sir	Shivcharan Satnami	Computer data delete on the 1st of every month.	01/08/2025 18:00:00	monthly	Yes	No
53	AdminOffice	MD Sir	Shivcharan Satnami	Creditor Outstanding check.	10/07/2025 18:00:00	daily	Yes	No
54	AdminOffice	MD Sir	Shivcharan Satnami	Debtor Outstanding check.	10/07/2025 18:00:00	daily	Yes	No
55	AdminOffice	MD Sir	Shivcharan Satnami	ESIC Payment on the 10th of every month whatsapp to sumeet sir	10/07/2025 18:00:00	monthly	Yes	No
56	AdminOffice	MD Sir	Shivcharan Satnami	Every Monday Weekly Stock Entry	14/07/2025 00:00:00	weekly	Yes	No
57	AdminOffice	MD Sir	Shivcharan Satnami	File Arrangement & Set on the 21st of every month.	21/07/2025 18:00:00	monthly	Yes	No
58	AdminOffice	MD Sir	Shivcharan Satnami	GST R-1 on the 8th of every month.	08/08/2025 18:00:00	monthly	Yes	No
59	AdminOffice	MD Sir	Shivcharan Satnami	GST R-3 on the 20th of every month.	20/08/2025 18:00:00	monthly	Yes	No
60	AdminOffice	MD Sir	Shivcharan Satnami	Invoice & E -Way Bill Chedk Daily	10/07/2025 18:00:00	daily	Yes	No
61	AdminOffice	MD Sir	Shivcharan Satnami	Kotak Bank Statement Entry & Print	10/07/2025 18:00:00	daily	Yes	No
62	AdminOffice	MD Sir	Shivcharan Satnami	Kotak Bank Statement Print on the 1st of every month.	01/08/2025 18:00:00	monthly	Yes	No
63	AdminOffice	MD Sir	Shivcharan Satnami	Management Folder Set on every month of 15th.	15/07/2025 18:00:00	monthly	Yes	No
64	AdminOffice	MD Sir	Shivcharan Satnami	Production Entry	10/07/2025 18:00:00	daily	Yes	No
65	AdminOffice	MD Sir	Shivcharan Satnami	Purchase Order Update करना है।	10/07/2025 18:00:00	daily	Yes	No
66	AdminOffice	MD Sir	Shivcharan Satnami	Purchase Register Check on the 15 th of every month.	15/07/2025 18:00:00	monthly	Yes	No
67	AdminOffice	MD Sir	Shivcharan Satnami	Q2 Entry (Ravi Marketing ) has to be done every Monday.	14/07/2025 18:00:00	weekly	Yes	No
68	AdminOffice	MD Sir	Shivcharan Satnami	Sales Register Check on the 5 th of every month.	05/08/2025 18:00:00	monthly	Yes	No
69	AdminOffice	MD Sir	Shivcharan Satnami	Tally transfer	10/07/2025 18:00:00	daily	Yes	No
70	AdminOffice	MD Sir	Shivcharan Satnami	Weekly Stock Paper Print on every Saturday.	12/07/2025 18:00:00	weekly	Yes	No
71	AdminOffice	MD Sir	Shivcharan Satnami	Weekly Stock Set & Submit on every Monday	14/07/2025 18:00:00	weekly	Yes	No
72	AdminOffice	MD Sir	Shivcharan Satnami	हर महिने की 3 तारिख को झोला सेट करना है।	03/08/2025	monthly	Yes	No
268	AdminOffice	MD Sir	Shivcharan Satnami	counter cash sale tally	03/11/2025 21:00:00	monthly	Yes	No
280	AdminOffice	MD Sir	Shivcharan Satnami	Porduction Summary print on the 3st of every month.	03/10/2025 21:00:00	monthly	Yes	No
281	AdminOffice	MD Sir	Shivcharan Satnami	Tally ERP data match	08/10/2025 21:00:00	weekly	Yes	No
296	AdminOffice	MD Sir	Shivcharan Satnami	अगरबत्ती लगाना है।	27/10/2025 11:00:00	daily	Yes	No
297	AdminOffice	MD Sir	Shivcharan Satnami	Computer data deleted 3rd of every month	03/11/2025 21:00:00	monthly	Yes	No
298	AdminOffice	MD Sir	Shivcharan Satnami	valuation check brass store 2nd of every month	02/11/2025 21:00:00	monthly	Yes	No
299	AdminOffice	MD Sir	Shivcharan Satnami	valuation check finish goods store 2nd of every month	02/11/2025 21:00:00	monthly	Yes	No
300	AdminOffice	MD Sir	Shivcharan Satnami	valuation check moulding store 2nd of every month	02/11/2025 21:00:00	monthly	Yes	No
301	AdminOffice	MD Sir	Shivcharan Satnami	valuation check packing chhotu bend 2nd of every month	02/11/2025 21:00:00	monthly	Yes	No
302	AdminOffice	MD Sir	Shivcharan Satnami	valuation check packing department 2nd of every month	02/11/2025 21:00:00	monthly	Yes	No
303	AdminOffice	MD Sir	Shivcharan Satnami	valuation check pipe store 2nd of every month	02/11/2025 21:00:00	monthly	Yes	No
349	AdminOffice	MD Sir	Shivcharan Satnami	Daily check Reward coupan	31/01/2026 18:00:00	daily	Yes	No
350	AdminOffice	MD Sir	Shivcharan Satnami	Purchase Entry	31/01/2026 18:00:00	daily	Yes	No`;

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

  // First, delete any exact match templates to avoid double generation before dedupe
  // Actually, deduplicating everything at the end is easier. But let's check what we have.

  const lines = rawTasks.split("\n");
  for (const l of lines) {
    if (!l.trim()) continue;
    const p = l.split("\t");

    // p[5] is like 22/07/2025 04:00:00 or 03/08/2025
    const dateStr = p[5].trim();
    const dateParts = dateStr.split(" ");
    const cal = dateParts[0].split("/");

    let timeStr = "00:00:00"; // default if missing
    if (dateParts.length > 1 && dateParts[1].length > 0) {
      timeStr = dateParts[1];
    }

    const isoLike = `${cal[2]}-${cal[1]}-${cal[0]}T${timeStr}`; // YYYY-MM-DDTHH:mm:ss

    tasksToInsert.push({
      department: p[1].trim(),
      given_by: p[2].trim(),
      name: p[3].trim(),
      task_description: p[4].trim(),
      task_start_date: isoLike, // keep the proper format
      frequency: p[6].trim().toLowerCase(),
      require_attachment: p[7].trim().toLowerCase() === "yes" ? "yes" : "no",
      enable_reminder: p[8].trim().toLowerCase() === "yes" ? "yes" : "no",
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

  for (const template of insertedTemplates) {
    // We parse it back to a standard JS date locally by adding T
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
