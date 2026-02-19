import * as fs from "fs";
import * as path from "path";

// Helper to parse date dd/mm/yyyy hh:mm:ss
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;
  // Format: 12/07/2025 18:00:00
  // We only care about the time and the day of month?
  // Actually we need to calculate *new* dates in 2026.
  // So we just need to parse the string to understand it if needed, but the requirements say:
  // "Calculate the correct task_start_date... based on frequency... and current date (2026-02-19)"
  return null;
}

const CURRENT_DATE = new Date("2026-02-19T00:00:00"); // Thursday

function getNextDayOfWeek(date: Date, dayName: string): Date {
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
    // Default to tomorrow if day not found
    resultDate.setDate(date.getDate() + 1);
    return resultDate;
  }

  // Calculate difference
  let diff = dayIndex - date.getDay();
  if (diff <= 0) {
    diff += 7; // Next occurrence
  }
  resultDate.setDate(date.getDate() + diff);
  return resultDate;
}

function getNextDateOfMonth(date: Date, dayOfMonth: number): Date {
  let resultDate = new Date(date.getFullYear(), date.getMonth(), dayOfMonth);
  if (resultDate <= date) {
    // Move to next month
    resultDate = new Date(date.getFullYear(), date.getMonth() + 1, dayOfMonth);
  }
  return resultDate;
}

function calculateStartDate(
  frequency: string,
  description: string,
  timeStr: string,
  originalDateStr: string,
): string {
  // extract time from originalDateStr "12/07/2025 18:00:00" -> "18:00:00"
  let timePart = "09:00:00"; // Default
  if (originalDateStr && originalDateStr.includes(" ")) {
    timePart = originalDateStr.split(" ")[1];
  }

  const freq = frequency.toLowerCase().trim();
  let startDate = new Date(CURRENT_DATE.getTime());

  // Daily -> Tomorrow
  if (freq === "daily") {
    startDate.setDate(CURRENT_DATE.getDate() + 1);
  }
  // Weekly
  else if (freq === "weekly") {
    // Find day name in description
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
    for (const d of days) {
      if (description.toLowerCase().includes(d)) {
        foundDay = d;
        break; // Take first match
      }
    }

    // Hindi mapping?
    // सोमवार -> Monday, मंगलवार -> Tuesday, बुधवार -> Wednesday, गुरुवार/बृहस्पतिवार -> Thursday, शुक्रवार -> Friday, शनिवार -> Saturday, रविवार -> Sunday
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
      // Default to tomorrow or calculate based on original day difference?
      // "If no day specified, use next Monday" as per plan?
      // Better to default to tomorrow + 1 or next Monday?
      // User requirement: "ensure that weekly tasks with specific day mentions... are scheduled. If no day..." make reasonable assumption.
      // Let's us Next Monday default for weekly.
      startDate = getNextDayOfWeek(CURRENT_DATE, "monday");
    }
  }
  // Monthly
  else if (freq === "monthly") {
    // Look for "Xth" or "X तारीख" or "X st/nd/rd"
    // Regex for number followed by th, st, nd, rd or तारीख
    const match = description.match(/(\d+)\s*(st|nd|rd|th|तारीख|tarikh)/i);
    let dayOfMonth = 1;
    if (match) {
      dayOfMonth = parseInt(match[1], 10);
    } else {
      // Try to parse from description if just a number exists with "of month"?
      // Or default to 1st
      dayOfMonth = 1;
    }
    startDate = getNextDateOfMonth(CURRENT_DATE, dayOfMonth);
  }
  // Fortnightly
  else if (freq === "fortnightly") {
    startDate.setDate(CURRENT_DATE.getDate() + 14);
  }
  // Yearly etc
  else if (freq === "yearly") {
    // Specific dates usually in desc? "Diwali" -> unknown date.
    // Default to +1 year from now? Or specific month?
    // Data has "15/10/2025". We can use same Day/Month but 2026.
    if (originalDateStr) {
      const parts = originalDateStr.split(" ")[0].split("/"); // 15/10/2025
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1; // 0-indexed
        let y = 2026;
        // If date passed in 2026, use 2027?
        let tempDate = new Date(y, m, d);
        if (tempDate < CURRENT_DATE) y++;
        startDate = new Date(y, m, d);
      }
    } else {
      startDate.setFullYear(CURRENT_DATE.getFullYear() + 1);
    }
  } else {
    // Default
    startDate.setDate(CURRENT_DATE.getDate() + 1);
  }

  // Combine date and time
  // YYYY-MM-DD HH:mm:ss
  const yyyy = startDate.getFullYear();
  const mm = String(startDate.getMonth() + 1).padStart(2, "0");
  const dd = String(startDate.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${timePart}`;
}

function escapeSql(str: string): string {
  if (!str) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

function main() {
  const rawDataPath = path.join(__dirname, "raw_checklist_data.txt");
  const rawData = fs.readFileSync(rawDataPath, "utf8");
  const lines = rawData.split("\n"); // Split by lines (CRLF or LF handled?)
  // Handle CRLF
  const cleanedLines = lines.map((l) => l.replace("\r", ""));

  const sqlStatements: string[] = [];
  sqlStatements.push(`TRUNCATE TABLE public.checklist RESTART IDENTITY;`);

  // Headers: Task ID (0), Department (1), Given By (2), Name (3), Task Description (4), Task Start Date (5), Freq (6), Enable Reminders (7), Require Attachment (8), SAMPLE IMAGES (9)

  for (let i = 1; i < cleanedLines.length; i++) {
    // Skip header
    const line = cleanedLines[i];
    if (!line.trim()) continue;

    const cols = line.split("\t");
    if (cols.length < 5) continue; // Basic validation

    const department = cols[1];
    const givenBy = cols[2];
    const name = cols[3];
    const description = cols[4];
    const originalDate = cols[5];
    const frequency = cols[6] || "";
    const enableReminderSrc = cols[7] || "No";
    const requireAttachmentSrc = cols[8] || "No";
    const image = cols[9] || "";

    // Enums
    const enableReminder =
      enableReminderSrc.toLowerCase() === "yes" ? "yes" : "no";
    const requireAttachment =
      requireAttachmentSrc.toLowerCase() === "yes" ? "yes" : "no";

    // Calculate Start Date
    const taskStartDate = calculateStartDate(
      frequency,
      description,
      "",
      originalDate,
    );

    // Status default 'pending'?
    const status = "pending";

    const sql = `INSERT INTO public.checklist (department, given_by, name, task_description, task_start_date, frequency, enable_reminder, require_attachment, status, image, created_at) VALUES (${escapeSql(department)}, ${escapeSql(givenBy)}, ${escapeSql(name)}, ${escapeSql(description)}, '${taskStartDate}', ${escapeSql(frequency)}, '${enableReminder}', '${requireAttachment}', '${status}', ${escapeSql(image)}, NOW());`;

    sqlStatements.push(sql);
  }

  const outputPath = path.join(__dirname, "checklist_migration.sql");
  fs.writeFileSync(outputPath, sqlStatements.join("\n"));
  console.log(
    `Generated ${sqlStatements.length} SQL statements to ${outputPath}`,
  );
}

main();
