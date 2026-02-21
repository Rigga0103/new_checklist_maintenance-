const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rawTasks = `48	Packing	MD Sir	Mohan Chandrakar	J बॉक्स स्क्रैप का वजन करके राकेश को देना है	14/07/2025 18:00:00	daily	Yes	No
176	Packing	MD Sir	Mohan Chandrakar	1और 2 लाईन के टेबल के नीचे कोई सामान तो नहीं रखा है ये चेक करवाना है&फोटो लेकर अपलोड करना है	22/07/2025 12:00:00	daily	Yes	Yes
177	Packing	MD Sir	Mohan Chandrakar	Fitting का सामान सही रखवाना है।	14/07/2025 18:00:00	weekly	Yes	No
178	Packing	MD Sir	Mohan Chandrakar	Junction Box की बोरी सही से रखवाना है।	10/07/2025 18:00:00	daily	Yes	No
179	Packing	MD Sir	Mohan Chandrakar	PACKING स्टोर का फोटो डालना है	23/07/2025 23:00:00	daily	Yes	Yes
180	Packing	MD Sir	Mohan Chandrakar	खाली Box कहीं पे फैला तो नहीं है ये चेक करवाना है।	10/07/2025 18:00:00	daily	Yes	No
181	Packing	MD Sir	Mohan Chandrakar	झाडू लगवाना है।	10/07/2025 18:00:00	daily	Yes	No
182	Packing	MD Sir	Mohan Chandrakar	बोरी सही जगह पर रखवाना है।	10/07/2025 18:00:00	daily	Yes	No
183	Packing	MD Sir	Mohan Chandrakar	मशीन की सफाई करवाना है।	10/07/2025 18:00:00	daily	Yes	No
184	Packing	MD Sir	Mohan Chandrakar	हर महीने की 1 तारिख को Working Floor Wash करवाना और  फोटो डालना है।	01/08/2025 18:00:00	monthly	Yes	Yes
185	Packing	MD Sir	Mohan Chandrakar	हर शनिवार को Packing Department का जाला सफाई करवाना है और  फोटो डालना है ।	12/07/2025 18:00:00	weekly	Yes	Yes
186	Packing	MD Sir	Mohan Chandrakar	हर सोमवार को Packing Store Set करवाना है।	14/07/2025 18:00:00	weekly	Yes	No
315	Packing	MD Sir	Mohan Chandrakar	production paper by 5pm	30/10/2025 17:00:00	daily	Yes	No
339	Packing	MD Sir	Mohan Chandrakar	Note down the scrap data from Mohan and give it to Rakesh	15/01/2026 18:00:00	daily	Yes	No`;

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

  console.log("Inserting base templates for Mohan Chandrakar's tasks...");
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
