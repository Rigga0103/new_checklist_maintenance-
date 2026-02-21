const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rawTasks = `46	AdminOffice	MD Sir	Mansi Verma	Dispatch detail लेना है विनोद से	14/07/2025 18:00:00	daily	Yes	No
47	AdminOffice	MD Sir	Mansi Verma	lunch time check all operator(rakesh, prashant, chhotu,pratap)& vinod	22/07/2025 18:00:00	daily	Yes	No
90	AdminOffice	MD Sir	Mansi Verma	GUARD REGISTER PROPERLY CHECK	12/07/2025 18:00:00	daily	Yes	No
207	AdminOffice	MD Sir	Mansi Verma	Check documents to be filled & not to be kept loose in drwer of anyone - daily 5:30 pm	14/07/2025 18:00:00	daily	Yes	No
222	AdminOffice	MD Sir	Mansi Verma	Pms sheet operate 	30/07/2025 18:00:00	daily	Yes	No
238	AdminOffice	MD Sir	Mansi Verma	Attendance Check imm & pipe dept	22/08/2025 06:00:00	daily	Yes	No
245	AdminOffice	MD Sir	Mansi Verma	"Production Planning Papers
a. imm planning
b. Pipe planning
c. bend planning
d. mohan planning
e. guddu planning"	16/09/2025 18:00:00	daily	Yes	No
246	AdminOffice	MD Sir	Mansi Verma	sales invoice check	16/09/2025 18:00:00	daily	Yes	No
247	AdminOffice	MD Sir	Mansi Verma	purchase invoice check	16/09/2025 18:00:00	daily	Yes	No
248	AdminOffice	MD Sir	Mansi Verma	sales order pending check	16/09/2025 18:00:00	daily	Yes	No
249	AdminOffice	MD Sir	Mansi Verma	purchase order pending check	16/09/2025 18:00:00	daily	Yes	No
250	AdminOffice	MD Sir	Mansi Verma	"production check in register 
a. chottu pipe
b. chottu bend
c. mohan 
d. guddu"	16/09/2025 18:00:00	daily	Yes	No
251	AdminOffice	MD Sir	Mansi Verma	absent amount check of employee	16/09/2025 18:00:00	daily	Yes	No
252	AdminOffice	MD Sir	Mansi Verma	dispatch vehicle ( guard register )	16/09/2025 18:00:00	daily	Yes	No
253	AdminOffice	MD Sir	Mansi Verma	Production tally with all production sheets	16/09/2025 18:00:00	daily	Yes	No
254	AdminOffice	MD Sir	Mansi Verma	 Jaroda cash	16/09/2025 18:00:00	daily	Yes	No
255	AdminOffice	MD Sir	Mansi Verma	Day Book	16/09/2025 18:00:00	daily	Yes	No
256	AdminOffice	MD Sir	Mansi Verma	"production papers ::
a. imm production day / night
b. pipe production paper
c. pipe weight papers
d. bend production check
e. mohan production paper
f. guddu production paper"	16/09/2025 18:00:00	daily	Yes	No
317	AdminOffice	MD Sir	Mansi Verma	हर  मंगलवार को Production planning बनवाना है 	04/11/2025 18:00:00	weekly	Yes	No
351	AdminOffice	MD Sir	Mansi Verma	Daily Check whatsapp lr no, purchase order, sales inv, purchase inv, going or not 	01/02/2026 18:00:00	daily	Yes	No`;

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
  }

  return dates;
}

function toSupabaseTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function run() {
  const tasksToInsert = [];

  // Parse TSV properly handling quoted strings with newlines
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
        // Ensure array represents a single task correctly
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

  console.log("Inserting base templates for Mansi's tasks...");
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
