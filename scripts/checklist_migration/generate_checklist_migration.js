const fs = require("fs");
const path = require("path");

const CURRENT_DATE = new Date("2026-02-19T00:00:00"); // Thursday

function getNextDayOfWeek(date, dayName) {
  const resultDate = new Date(date.getTime());
  resultDate.setHours(0, 0, 0, 0); // start of day

  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayIndex = days.indexOf(dayName.toLowerCase());

  if (dayIndex === -1) {
    resultDate.setDate(date.getDate() + 1);
    return resultDate;
  }

  let diff = dayIndex - date.getDay();
  if (diff <= 0) {
    diff += 7; // Next occurrence
  }
  resultDate.setDate(date.getDate() + diff);
  return resultDate;
}

function getNextDateOfMonth(date, dayOfMonth) {
  let resultDate = new Date(date.getFullYear(), date.getMonth(), dayOfMonth);
  if (resultDate <= date) {
    resultDate = new Date(date.getFullYear(), date.getMonth() + 1, dayOfMonth);
  }
  return resultDate;
}

function calculateStartDate(frequency, description, timeStr, originalDateStr) {
  let timePart = "09:00:00";
  if (originalDateStr && originalDateStr.includes(" ")) {
    timePart = originalDateStr.split(" ")[1];
  }

  const freq = (frequency || "").toLowerCase().trim();
  let startDate = new Date(CURRENT_DATE.getTime());

  if (freq === "daily") {
    startDate.setDate(CURRENT_DATE.getDate() + 1);
  } else if (freq === "weekly") {
    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    let foundDay = "";
    const lowerDesc = (description || "").toLowerCase();
    for (const d of days) {
      if (lowerDesc.includes(d)) {
        foundDay = d;
        break;
      }
    }

    if (!foundDay) {
      if (description.includes("सोमवार")) foundDay = "monday";
      else if (description.includes("मंगलवार")) foundDay = "tuesday";
      else if (description.includes("बुधवार")) foundDay = "wednesday";
      else if (
        description.includes("गुरुवार") ||
        description.includes("बृहस्पतिवार")
      )
        foundDay = "thursday";
      else if (description.includes("शुक्रवार")) foundDay = "friday";
      else if (description.includes("शनिवार")) foundDay = "saturday";
      else if (description.includes("रविवार")) foundDay = "sunday";
    }

    if (foundDay) {
      startDate = getNextDayOfWeek(CURRENT_DATE, foundDay);
    } else {
      startDate = getNextDayOfWeek(CURRENT_DATE, "monday");
    }
  } else if (freq === "monthly") {
    const match = description.match(/(\d+)\s*(st|nd|rd|th|तारीख|tarikh)/i);
    let dayOfMonth = 1;
    if (match) {
      dayOfMonth = parseInt(match[1], 10);
    }
    startDate = getNextDateOfMonth(CURRENT_DATE, dayOfMonth);
  } else if (freq === "fortnightly") {
    startDate.setDate(CURRENT_DATE.getDate() + 14);
  } else if (freq === "yearly") {
    if (originalDateStr) {
      const parts = originalDateStr.split(" ")[0].split("/");
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        let y = 2026;
        let tempDate = new Date(y, m, d);
        if (tempDate < CURRENT_DATE) y++;
        startDate = new Date(y, m, d);
      }
    } else {
      startDate.setFullYear(CURRENT_DATE.getFullYear() + 1);
    }
  } else {
    startDate.setDate(CURRENT_DATE.getDate() + 1);
  }

  const yyyy = startDate.getFullYear();
  const mm = String(startDate.getMonth() + 1).padStart(2, "0");
  const dd = String(startDate.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${timePart}`;
}

function escapeSql(str) {
  if (!str) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

function main() {
  const rawDataPath = path.join(__dirname, "raw_checklist_data.txt");
  const rawData = fs.readFileSync(rawDataPath, "utf8");
  const lines = rawData.split("\n").map((l) => l.replace("\r", ""));

  let sqlStatements = [];
  // Only the first file needs truncate? Or all?
  // We can put TRUNCATE in the first file.
  sqlStatements.push(`TRUNCATE TABLE public.checklist RESTART IDENTITY;`);

  let allStatements = [];
  allStatements.push(`TRUNCATE TABLE public.checklist RESTART IDENTITY;`);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = line.split("\t");
    if (cols.length < 5) continue;

    const department = cols[1];
    const givenBy = cols[2];
    const name = cols[3];
    const description = cols[4];
    const originalDate = cols[5];
    const frequency = cols[6] || "";
    const enableReminderSrc = cols[7] || "No";
    const requireAttachmentSrc = cols[8] || "No";
    const image = cols[9] || "";

    const enableReminder =
      enableReminderSrc.toLowerCase() === "yes" ? "yes" : "no";
    const requireAttachment =
      requireAttachmentSrc.toLowerCase() === "yes" ? "yes" : "no";

    const taskStartDate = calculateStartDate(
      frequency,
      description,
      "",
      originalDate,
    );
    const status = "pending";

    const sql = `INSERT INTO public.checklist (department, given_by, name, task_description, task_start_date, frequency, enable_reminder, require_attachment, status, image, created_at) VALUES (${escapeSql(department)}, ${escapeSql(givenBy)}, ${escapeSql(name)}, ${escapeSql(description)}, '${taskStartDate}', ${escapeSql(frequency)}, '${enableReminder}', '${requireAttachment}', '${status}', ${escapeSql(image)}, NOW());`;

    allStatements.push(sql);
  }

  // Split into chunks of 20
  const CHUNK_SIZE = 20;
  let chunkIndex = 1;
  for (let i = 0; i < allStatements.length; i += CHUNK_SIZE) {
    const chunk = allStatements.slice(i, i + CHUNK_SIZE);
    const outputPath = path.join(__dirname, `migration_part_${chunkIndex}.sql`);
    fs.writeFileSync(outputPath, chunk.join("\n"));
    console.log(
      `Generated part ${chunkIndex} with ${chunk.length} statements.`,
    );
    chunkIndex++;
  }
}

main();
