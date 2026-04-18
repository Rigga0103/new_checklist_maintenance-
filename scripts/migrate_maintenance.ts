import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map of columns based on user provided header
// Timestamp, Task ID, Company Name, Given By, Name, Task Description, Task Start Date, Freq, Enable Reminders, Require Attachment, Actual, Delay, Status, Remarks, Uploaded Image, Admin Done, Buddy

interface RawRow {
  timestamp: string;
  taskId: string;
  companyName: string; // -> machine_name
  givenBy: string;
  name: string; // -> assigned_to
  description: string; // -> task_description
  startDate: string; // -> task_start_date
  freq: string; // -> frequency
  enableReminders: string;
  requireAttachment: string;
  actual: string; // -> actual_date (if present)
  delay: string; // -> delay
  status: string; // -> status
  remarks: string; // -> remarks
  image: string; // -> image_url
  adminDone: string;
  buddy: string;
}

const parseDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim() === "") return null;
  // Format: DD/MM/YYYY HH:mm:ss or D/M/YYYY ...
  try {
    const [datePart, timePart] = dateStr.trim().split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    let hours = 0,
      minutes = 0,
      seconds = 0;

    if (timePart) {
      const parts = timePart.split(":").map(Number);
      hours = parts[0] || 0;
      minutes = parts[1] || 0;
      seconds = parts[2] || 0;
    }

    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    if (isNaN(date.getTime())) return null;

    // Return ISO string for Supabase (timestamptz)
    // Adjust for timezone if needed, but assuming input is local or UTC based on context?
    // User is in +05:30. Let's send as ISO string which Supabase will interpret.
    // To be safe, construct strictly: YYYY-MM-DDTHH:mm:ss
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } catch (e) {
    console.error(`Failed to parse date: ${dateStr}`);
    return null;
  }
};

const runMigration = async () => {
  const parts = [
    "maintenance_data_part1.txt",
    "maintenance_data_part2.txt",
    "maintenance_data_part3.txt",
  ];
  let fileContent = "";

  for (const part of parts) {
    const p = path.join(process.cwd(), part);
    if (fs.existsSync(p)) {
      console.log(`Reading ${part}...`);
      fileContent += fs.readFileSync(p, "utf-8") + "\n";
    } else {
      console.warn(`Warning: ${part} not found.`);
    }
  }

  if (!fileContent.trim()) {
    console.error("No data found in part files!");
    return;
  }

  const lines = fileContent.split("\n");

  // Headers are on the first line, but let's just index them by position to be robust
  // 0: Timestamp
  // 1: Task ID
  // 2: Company Name (Machine Name)
  // 3: Given By
  // 4: Name (Assigned To)
  // 5: Task Description
  // 6: Task Start Date
  // 7: Freq
  // 8: Enable Reminders
  // 9: Require Attachment
  // 10: Actual
  // 11: Delay
  // 12: Status
  // 13: Remarks
  // 14: Uploaded Image
  // 15: Admin Done
  // 16: Buddy

  const rowsToInsert = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split("\t"); // Assuming tab separated as copied from Sheet

    // Fallback if space separated, but sheet copy usually is tab
    // If cols length is small, maybe it's CSV?
    // The user input looks like tabs.

    const actual = cols[10]?.trim();

    // Only process if Actual date is present
    if (!actual) continue;

    const rowData = {
      machine_name: cols[2]?.trim() || "Unknown",
      assigned_to: cols[4]?.trim(),
      task_description: cols[5]?.trim(),
      task_start_date: parseDate(cols[6]),
      frequency: cols[7]?.trim(),
      actual_date: parseDate(actual), // This is the 'Actual' column
      delay: cols[11]?.trim(),
      status:
        cols[12]?.trim() === "Yes" ? "Done" : cols[12]?.trim() || "Pending",
      remarks: cols[13]?.trim(),
      image_url: cols[14]?.trim(),
      // 'Admin Done' (col 15) usually empty or same as Actual?
      // User said "make sure only this data".
      // We'll map 'doer_name' to 'assigned_to' for now as 'Name' is there.
      doer_name: cols[4]?.trim(),
      department: "Maintenance", // Default
      created_at: new Date().toISOString(),
    };

    if (rowData.actual_date) {
      rowsToInsert.push(rowData);
    }
  }

  console.log(`Found ${rowsToInsert.length} rows to insert.`);

  // Insert in chunks
  const chunkSize = 50;
  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from("machine_maintenance").insert(chunk);
    if (error) {
      console.error("Error inserting chunk:", error);
    } else {
      console.log(`Inserted rows ${i + 1} to ${i + chunk.length}`);
    }
  }

  console.log("Migration complete.");
};

runMigration().catch(console.error);
