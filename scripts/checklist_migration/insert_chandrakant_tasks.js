const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rawTasks = `10	security guard 	MD Sir	Chandrakant Kurre	Labour Attendance तैयार करना ।	09/07/2025 18:00:00	daily	Yes	No
11	security guard 	MD Sir	Chandrakant Kurre	Labour Quarter टंकी में पानी भरना।	09/07/2025 18:00:00	daily	Yes	No
12	security guard 	MD Sir	Chandrakant Kurre	" molding department me pani bharna (मोल्डिंग विभाग में पानी भरना)"	09/07/2025 18:00:00	daily	Yes	No
13	security guard 	MD Sir	Chandrakant Kurre	Office Chair Set Daily.	09/07/2025 18:00:00	daily	Yes	No
14	security guard 	MD Sir	Chandrakant Kurre	Packing और Dispatch वाला Shutter बंद करना है।	09/07/2025 18:00:00	daily	Yes	No
15	security guard 	MD Sir	Chandrakant Kurre	Parking Set करवाना।	09/07/2025 18:00:00	daily	Yes	Yes	https://drive.google.com/file/d/1oA1Do3__NB6UJd9MUU4wT19_hWJJJO_B/view?usp=drive_link
16	security guard 	MD Sir	Chandrakant Kurre	Pipe टंकी में पानी भरना।	09/07/2025 18:00:00	daily	Yes	No
17	security guard 	MD Sir	Chandrakant Kurre	Register Maintain करना है।	09/07/2025 18:00:00	daily	Yes	No
18	security guard 	MD Sir	Chandrakant Kurre	Transformer Oil Check और फोटो डालना है 	09/07/2025 18:00:00	daily	Yes	Yes	https://drive.google.com/file/d/1k7BeFuKPH94CkDLqTGeOBRBOX4ZqtfoL/view?usp=drive_link
19	security guard 	MD Sir	Chandrakant Kurre	अर्थिंग में पानी डालना है।	09/07/2025 18:00:00	daily	Yes	Yes	https://drive.google.com/file/d/1PkD-H8YCMaDFC2W2kJBUHJSCR7snlZgi/view?usp=drive_link
20	security guard 	MD Sir	Chandrakant Kurre	आॅफिस के ऊपर वाली टंकी में पानी भरना है।	09/07/2025 18:00:00	daily	Yes	No
21	security guard 	MD Sir	Chandrakant Kurre	बाहर वाली टंकी में पानी डालना है।	09/07/2025 18:00:00	daily	Yes	No
22	security guard 	MD Sir	Chandrakant Kurre	रोज रात को 8 बजे Pipe और IMM Department के बीच का गेट लॉक करना है	22/07/2025 20:00:00	daily	Yes	No
23	security guard 	MD Sir	Chandrakant Kurre	सभी डस्टबिन के कागज़ साफ़ करें और जला दें	22/07/2025 20:00:00	daily	Yes	No
24	security guard 	MD Sir	Chandrakant Kurre	हर महिने की 5 तारिख को बोरी वाले को बुलाके बोरी बेचना है।	05/08/2025 18:00:00	monthly	Yes	No
25	security guard 	MD Sir	Chandrakant Kurre	हर महीने पहला मंगलवार को हनुमान जी का ध्वज बदलना है।	05/08/2025 18:00:00	monthly	Yes	No
26	security guard 	MD Sir	Chandrakant Kurre	हर सोमवार को सुमीत सर का गाड़ी धोना है।	14/07/2025 18:00:00	weekly	Yes	No
208	security guard 	MD Sir	Chandrakant Kurre	हर 15 दिन में Front Parking area की सफाई करवाना और फोटो डालना है 	15/07/2025 10:00:00	fortnightly	Yes	No
209	security guard 	MD Sir	Chandrakant Kurre	हर 15 दिन में Main Gate की सफाई करवाना और फोटो डालना है 	15/07/2025 09:00:00	fortnightly	Yes	No
259	security guard 	MD Sir	Chandrakant Kurre	"Daily morning 6 am light off in factory and office"	24/09/2025 07:00:00	daily	Yes	No`;

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
    case "fortnightly": {
      const cur = new Date(START_DATE);
      cur.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
      while (cur <= END_DATE) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 14);
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

    const dateStr = p[5].trim();
    const dateParts = dateStr.split(" ");
    const cal = dateParts[0].split("/");

    let timeStr = "00:00:00";
    if (dateParts.length > 1 && dateParts[1].length > 0) {
      timeStr = dateParts[1];
    }

    const isoLike = `${cal[2]}-${cal[1]}-${cal[0]}T${timeStr}`;

    let imageLink = null;
    if (p.length > 9 && p[9] && p[9].trim().startsWith("http")) {
      imageLink = p[9].trim();
    } else if (p.length > 8 && p[8] && p[8].trim().startsWith("http")) {
      imageLink = p[8].trim();
    }

    let desc = p[4].trim();
    if (desc.startsWith('"') && desc.endsWith('"')) {
      desc = desc.substring(1, desc.length - 1).trim();
    }

    tasksToInsert.push({
      department: p[1].trim(),
      given_by: p[2].trim(),
      name: p[3].trim(),
      task_description: desc,
      task_start_date: isoLike,
      frequency: p[6].trim().toLowerCase(),
      require_attachment: p[7].trim().toLowerCase() === "yes" ? "yes" : "no",
      enable_reminder: p[8].trim().toLowerCase() === "yes" ? "yes" : "no",
      status: "pending",
      image: imageLink,
    });
  }

  console.log("Inserting base templates for Chandrakant's tasks...");
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
        image: template.image,
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
