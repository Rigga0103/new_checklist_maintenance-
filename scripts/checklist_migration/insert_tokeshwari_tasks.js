const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rawTasks = `91	AdminOffice	MD Sir	Tokeshwari Sahu	आँगन सफाई करना है।	11/07/2025 18:00:00	daily	Yes	No
92	AdminOffice	MD Sir	Tokeshwari Sahu	आॅफिस के सभी टेबल की साफ - सफाई करना है।	11/07/2025 18:00:00	daily	Yes	No
93	AdminOffice	MD Sir	Tokeshwari Sahu	ऊपर और नीचे का झाड़ू ,पोंछा करना है।	11/07/2025 18:00:00	daily	Yes	No
94	AdminOffice	MD Sir	Tokeshwari Sahu	खाना बनाना है।	11/07/2025 18:00:00	daily	Yes	No
95	AdminOffice	MD Sir	Tokeshwari Sahu	गाय के लिए रोटी बनाना है।	11/07/2025 18:00:00	daily	Yes	No
96	AdminOffice	MD Sir	Tokeshwari Sahu	चाय बनाना है।	11/07/2025 18:00:00	daily	Yes	No
97	AdminOffice	MD Sir	Tokeshwari Sahu	बर्तन सफाई करना है।	11/07/2025 18:00:00	daily	Yes	No
98	AdminOffice	MD Sir	Tokeshwari Sahu	मटकी में पानी भरना है।	22/07/2025 10:00:00	daily	Yes	No
99	AdminOffice	MD Sir	Tokeshwari Sahu	हर मंगलवार को सुमीत सर के Washroomका Floor Clean करना है।	15/07/2025 18:00:00	weekly	Yes	No
100	AdminOffice	MD Sir	Tokeshwari Sahu	हर मंगलवार को सुमीत सर के Washroomका Mirror Wipe करना है।	15/07/2025 18:00:00	weekly	Yes	No
101	AdminOffice	MD Sir	Tokeshwari Sahu	हर मंगलवार को सुमीत सर के Washroomका Tiles Wash करना है।	15/07/2025 18:00:00	weekly	Yes	No
102	AdminOffice	MD Sir	Tokeshwari Sahu	हर महिने 1 तारिख को सुमीत सर के केबिन का टेबल हटाकर साफ - सफाई करना है।	01/08/2025 18:00:00	monthly	Yes	No
103	AdminOffice	MD Sir	Tokeshwari Sahu	हर महिने 1 तारिख को राशन सामान का लिस्ट तैयार करवाना है।(MANSI)	01/08/2025 18:00:00	monthly	Yes	No
104	AdminOffice	MD Sir	Tokeshwari Sahu	हर महिने 1 तारिख को टी.वी. खोलकर साफ - सफाई करना है।	01/07/2025 18:00:00	monthly	Yes	No
105	AdminOffice	MD Sir	Tokeshwari Sahu	हर महिने 1 तारिख को स्टेशनरी सामान का लिस्ट बनवाना है।(MANSI)	01/08/2025 18:00:00	monthly	Yes	No
106	AdminOffice	MD Sir	Tokeshwari Sahu	हर महिने 2 तारिख को सुमीत सर के केबिन का ड्राॅज साफ करना है।	02/08/2025 18:00:00	monthly	Yes	No
107	AdminOffice	MD Sir	Tokeshwari Sahu	हर महिने 5 तारिख को आॅफिस के सामने वाली दीवार को साफ करना है।	05/08/2025 18:00:00	monthly	Yes	No
108	AdminOffice	MD Sir	Tokeshwari Sahu	हर महिने की 2 तारिख को आॅफिस का पर्दा साफ करना है।	02/08/2025 18:00:00	monthly	Yes	No
109	AdminOffice	MD Sir	Tokeshwari Sahu	हर महीनें की 1 तारीख को गुड्डू और मोहन व मंदिर का कपड़ा साफ करना है।	01/08/2025 18:00:00	monthly	Yes	No
110	AdminOffice	MD Sir	Tokeshwari Sahu	हर शनिवार को कपड़ा साफ करना है।	12/07/2025 18:00:00	weekly	Yes	No
111	AdminOffice	MD Sir	Tokeshwari Sahu	हर शनिवार को जाला साफ करना है।	12/07/2025 18:00:00	weekly	Yes	No
112	AdminOffice	MD Sir	Tokeshwari Sahu	हर शनिवार को फ्रिज साफ करना है।	12/07/2025 18:00:00	weekly	Yes	No
113	AdminOffice	MD Sir	Tokeshwari Sahu	हर शनिवार को सामान वाली आलमारी को साफ करना है।	12/07/2025 18:00:00	weekly	Yes	No
114	AdminOffice	MD Sir	Tokeshwari Sahu	हर सोमवार को Lucky Bamboo Plant का देखभाल करना है।	14/07/2025 18:00:00	weekly	Yes	No
115	AdminOffice	MD Sir	Tokeshwari Sahu	हर सोमवार को आँगन की धुलाई करना है।	14/07/2025 18:00:00	weekly	Yes	No
116	AdminOffice	MD Sir	Tokeshwari Sahu	हर सोमवार को जितना भी काँच(Glass) है उसको साफ करना है।	14/07/2025 18:00:00	weekly	Yes	No
117	AdminOffice	MD Sir	Tokeshwari Sahu	हर सोमवार को पंखा सफाई करना है।	14/07/2025 18:00:00	weekly	Yes	No
118	AdminOffice	MD Sir	Tokeshwari Sahu	हर सोमवार को ब्लोवर से खिड़की की सफाई करना है।	14/07/2025 18:00:00	weekly	Yes	No
119	AdminOffice	MD Sir	Tokeshwari Sahu	हर सोमवार को मंदिर की सफाई करना है।	14/07/2025 18:00:00	weekly	Yes	No
211	AdminOffice	MD Sir	Tokeshwari Sahu	हर 15 दिन में स्टोर रूम का सामान हटाकर साफ - सफाई करना है।	15/07/2025 18:00:00	fortnightly	Yes	No
212	AdminOffice	MD Sir	Tokeshwari Sahu	हर 15 दिनों में सुमीत सर के Washroom का Hand Soap Check करना है।	15/07/2025 18:00:00	fortnightly	Yes	No
239	AdminOffice	MD Sir	Tokeshwari Sahu	रोज सुबह स्पीकर में भजन चालू करना है 	25/08/2025 18:00:00	daily	Yes	No`;

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
  }

  return dates;
}

function toSupabaseTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function run() {
  const tasksToInsert = [];

  // Parse TSV properly handling potential quoted strings with newlines
  let parsedTokens = [];
  let currentToken = "";
  let inQuote = false;

  for (let i = 0; i < rawTasks.length; i++) {
    let char = rawTasks[i];

    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === "\t" && !inQuote) {
      parsedTokens.push(currentToken);
      currentToken = "";
    } else if (char === "\n" && !inQuote) {
      parsedTokens.push(currentToken);
      if (parsedTokens.length >= 8) {
        tasksToInsert.push(parsedTokens);
      }
      parsedTokens = [];
      currentToken = "";
    } else {
      currentToken += char;
    }
  }
  if (currentToken.length > 0) {
    parsedTokens.push(currentToken);
    if (parsedTokens.length >= 8) {
      tasksToInsert.push(parsedTokens);
    }
  }

  const baseTemplates = [];

  for (const p of tasksToInsert) {
    if (p.length < 8) continue;

    // p format: [ID, Dept, GivenBy, Name, Desc, Date, Freq, ReqAttach, EnableRemind, Image?]
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
    // Remove surrounding quotes from parsed token if any
    if (desc.startsWith('"') && desc.endsWith('"')) {
      desc = desc.substring(1, desc.length - 1).trim();
    }

    baseTemplates.push({
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

  console.log("Inserting base templates for Tokeshwari's tasks...");
  const baseTemplatesSQL = baseTemplates.map((t) => ({
    ...t,
    task_start_date: t.task_start_date.replace("T", " "),
  }));

  const { data: insertedTemplates, error: insertError } = await supabase
    .from("checklist")
    .insert(baseTemplatesSQL)
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
