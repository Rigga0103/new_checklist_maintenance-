const fs = require("fs");
const path = require("path");

const parseDate = (dateStr) => {
  if (!dateStr || dateStr.trim() === "") return null;
  // Format: DD/MM/YYYY HH:mm:ss
  try {
    const [datePart, timePart] = dateStr.trim().split(" ");
    // Handle edge case where dateStr might be just time or malformed
    if (!datePart.includes("/")) return null;

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

    // JS months 0-11
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    if (isNaN(date.getTime())) return null;

    const pad = (n) => n.toString().padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } catch (e) {
    console.error(`Failed to parse date: ${dateStr}`);
    return null;
  }
};

const escapeSql = (str) => {
  if (str === null || str === undefined) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
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
  const rowsToInsert = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split("\t");
    const actual = cols[10] ? cols[10].trim() : null;

    if (!actual) continue;

    const machineName = cols[2] ? cols[2].trim() : "Unknown";
    if (!machineName) continue;

    const rowData = {
      machine_name: machineName,
      assigned_to: cols[4] ? cols[4].trim() : null,
      task_description: cols[5] ? cols[5].trim() : null,
      task_start_date: parseDate(cols[6]),
      frequency: cols[7] ? cols[7].trim() : null,
      actual_date: parseDate(actual),
      delay: cols[11] ? cols[11].trim() : null,
      status: cols[12] && cols[12].trim() === "Yes" ? "Done" : "Done",
      remarks: cols[13] ? cols[13].trim() : null,
      image_url: cols[14] ? cols[14].trim() : null,
      doer_name: cols[4] ? cols[4].trim() : null,
      department: "Maintenance",
      created_at: new Date().toISOString(),
    };

    if (rowData.actual_date) {
      rowsToInsert.push(rowData);
    }
  }

  console.log(`Found ${rowsToInsert.length} valid rows.`);

  let sqlContent = "";
  const batchSize = 50;

  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize);
    const values = batch
      .map((row) => {
        // Removed assigned_to
        return `(${escapeSql(row.created_at)}, ${escapeSql(row.machine_name)}, ${escapeSql(row.task_description)}, ${escapeSql(row.frequency)}, ${escapeSql(row.department)}, ${escapeSql(row.task_start_date)}, ${escapeSql(row.actual_date)}, ${escapeSql(row.status)}, ${escapeSql(row.remarks)}, ${escapeSql(row.image_url)}, ${escapeSql(row.delay)}, ${escapeSql(row.doer_name)})`;
      })
      .join(",\n");

    sqlContent += `INSERT INTO machine_maintenance (created_at, machine_name, task_description, frequency, department, task_start_date, actual_date, status, remarks, image_url, delay, doer_name) VALUES\n${values};\n\n`;
  }

  fs.writeFileSync("maintenance_migration.sql", sqlContent);
  console.log("SQL migration file generated: maintenance_migration.sql");
};

runMigration().catch(console.error);
