const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rawTasks = `1	AdminOffice	MD Sir	Divya Nayak	Courier sheet update	12/07/2025 18:00:00	daily	Yes	No
2	AdminOffice	MD Sir	Divya Nayak	Every Monday List Generate All Party's Credit Note details.	14/07/2025 18:00:00	weekly	Yes	No
3	AdminOffice	MD Sir	Divya Nayak	Every Monday List Generate All Party's Debit Note details.	14/07/2025 18:00:00	weekly	Yes	No
4	AdminOffice	MD Sir	Divya Nayak	Monthly Statement has to be taken from the party on the 5th of every month.	05/08/2025 18:00:00	monthly	Yes	No
5	AdminOffice	MD Sir	Divya Nayak	व्हाट्सप्प में डेली स्टेटस डालना है	22/07/2025 18:00:00	daily	Yes	No
6	AdminOffice	MD Sir	Divya Nayak	हर महिने 3 तारिख को Mobile data delete करना है।	02/08/2025 18:00:00	monthly	Yes	No
7	AdminOffice	MD Sir	Divya Nayak	हर महिने की 5 तारिख को Monthly Statement Tally करना है।	05/08/2025 18:00:00	monthly	Yes	No
8	AdminOffice	MD Sir	Divya Nayak	हर सोमवार को Creditor Outstanding / ledger Match निकालना है।	14/07/2025 18:00:00	weekly	Yes	No
9	AdminOffice	MD Sir	Divya Nayak	हर सोमवार को Debtor Outstanding निकालना है।	14/07/2025 18:00:00	weekly	Yes	No
89	AdminOffice	MD Sir	Divya Nayak	BRASS PRICE WHATSAPP TO SUMMET SIR	12/07/2025 18:00:00	daily	Yes	No
223	AdminOffice	MD Sir	Divya Nayak	Factory licence renewal	10/11/2026 18:00:00	yearly	Yes	No
224	AdminOffice	MD Sir	Divya Nayak	Nexon insurance renewal	15/10/2025 18:00:00	yearly	Yes	No
225	AdminOffice	MD Sir	Divya Nayak	Factory insurance renewal	22/05/2026	yearly	Yes	No
236	AdminOffice	MD Sir	Divya Nayak	Sumeet kukreja (helth insurance)	05/06/2026 09:00:00	yearly	Yes	No
237	AdminOffice	MD Sir	Divya Nayak	pollution licence renewal and vespa insurance	06/10/2025 09:00:00	yearly	Yes	No
243	AdminOffice	MD Sir	Divya Nayak	Sales invoice file check & sign	06/10/2025 17:00:00	monthly	Yes	No
244	AdminOffice	MD Sir	Divya Nayak	Purchase invoice file check & sign	15/10/2025 18:00:00	monthly	Yes	No
283	AdminOffice	MD Sir	Divya Nayak	mob recharge-7240999991	07/02/2026 21:00:00	yearly	Yes	No
284	AdminOffice	MD Sir	Divya Nayak	mob recharge-9285040001	05/05/2026 21:00:00	yearly	Yes	No
285	AdminOffice	MD Sir	Divya Nayak	Airtel home bill payment	15/10/2025 21:00:00	monthly	Yes	No
286	AdminOffice	MD Sir	Divya Nayak	Electricity Home bill payment	20/10/2025 21:00:00	monthly	Yes	No
287	AdminOffice	MD Sir	Divya Nayak	Fast tag recharge	03/10/2025 21:00:00	monthly	Yes	No
288	AdminOffice	MD Sir	Divya Nayak	Google work space	01/11/2025 21:00:00	monthly	Yes	No
289	AdminOffice	MD Sir	Divya Nayak	Every Monday Indent generate	13/10/2025 18:00:00	weekly	Yes	No
321	AdminOffice	MD Sir	Divya Nayak	Debtor monthly statement whatsapp	02/01/2026 18:00:00	monthly	Yes	No
332	AdminOffice	MD Sir	Divya Nayak	Mittal traders amount(3%) 8th of every month	08/02/2026 18:00:00	monthly	Yes	No
346	AdminOffice	MD Sir	Divya Nayak	 ims sheet check & update lokesh (daily)	17/01/2026 09:00:00	daily	Yes	No`;

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

  console.log("Inserting base templates for Divya's tasks...");
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
