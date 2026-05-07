# ============================================================
# 04_build_seed.ps1  —  Export Supabase data → Docker seed SQL
# Usage: .\database\04_build_seed.ps1
# ============================================================

$SUPABASE_URL = "https://shgloxculzfaghlirxxy.supabase.co"
$ANON_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8"
$SEED_FILE    = "$PSScriptRoot\04_seed_data.sql"
$CONTAINER    = "rigga_postgres"
$DB_NAME      = "rigga_local"
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "    -- $msg" -ForegroundColor Yellow }

$HEADERS = @{
    "apikey"        = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
    "Prefer"        = "count=none"
}

function Get-TableRows($table, $order = "id", $maxRows = 60000) {
    $all = [System.Collections.Generic.List[object]]::new()
    $offset = 0
    $pageSize = 1000
    do {
        $url = "$SUPABASE_URL/rest/v1/$table`?select=*&limit=$pageSize&offset=$offset"
        if ($order) { $url += "&order=$order" }
        try {
            $batch = Invoke-RestMethod -Uri $url -Headers $HEADERS -TimeoutSec 30
            foreach ($r in $batch) { $all.Add($r) }
            $offset += $pageSize
        } catch {
            Write-Skip "  $table fetch error at offset $offset`: $($_.Exception.Message)"
            break
        }
    } while ($batch.Count -eq $pageSize -and $all.Count -lt $maxRows)
    return $all
}

function Val($v) {
    if ($null -eq $v)      { return "NULL" }
    if ($v -is [bool])     { return ($v ? "true" : "false") }
    if ($v -is [int32] -or $v -is [int64] -or $v -is [double] -or $v -is [decimal]) { return "$v" }
    $s = ($v -as [string]).Replace("'", "''")
    return "'$s'"
}

function Rows-To-Insert($table, $rows) {
    if ($rows.Count -eq 0) { return "-- ${table}: 0 rows`n" }
    $cols = $rows[0].PSObject.Properties.Name
    $colCsv = ($cols | ForEach-Object { "`"$_`"" }) -join ","
    $sb = [System.Text.StringBuilder]::new()
    foreach ($row in $rows) {
        $vals = ($cols | ForEach-Object { Val $row.$_ }) -join ","
        [void]$sb.AppendLine("INSERT INTO public.`"$table`" ($colCsv) OVERRIDING SYSTEM VALUE VALUES ($vals) ON CONFLICT DO NOTHING;")
    }
    return $sb.ToString()
}

# ---- Tables to export (ordered by FK deps) ----
$TABLES = @(
    @{ name="users";                    order="id" }
    @{ name="working_day_calender";     order="id" }
    @{ name="repair_machine_types";     order="id" }
    @{ name="unique_checklist";         order="task_id" }
    @{ name="unique_maintanence";       order="task_id" }
    @{ name="machines";                 order="id" }
    @{ name="maintenance_schedules";    order="id" }
    @{ name="machine_motors";           order="id" }
    @{ name="holidays";                 order="leave_date" }
    @{ name="repair_machine_names";     order="id" }
    @{ name="vendorlist";               order="id" }
    @{ name="itemdetails";              order="id" }
    @{ name="machine_maintenance";      order="task_id";   maxRows=5000 }
    @{ name="machine_repair";           order="task_id" }
    @{ name="delegation";               order="task_id" }
    @{ name="delegation_done";          order="created_at" }
    @{ name="user_permissions";         order="id" }
    @{ name="log_delegation";           order="id" }
    @{ name="log_maintenance";          order="id";        maxRows=3000 }
    @{ name="checklist";                order="task_id";   maxRows=3000 }
    @{ name="log_checklist";            order="id";        maxRows=3000 }
    @{ name="backup_checklist";         order=$null;       maxRows=1000 }
    @{ name="backup_machine_maintenance"; order="task_id" }
)

Write-Step "Building seed SQL file..."
$header = @"
-- ============================================================
-- 04_seed_data.sql  —  Production data snapshot for local Docker
-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
-- Source: Supabase project shgloxculzfaghlirxxy
-- ============================================================
SET session_replication_role = 'replica';
SET datestyle = 'ISO, DMY';

"@

Set-Content -Path $SEED_FILE -Value $header -Encoding UTF8

$totalRows = 0
foreach ($tbl in $TABLES) {
    $name   = $tbl.name
    $order  = $tbl.order
    $maxR   = if ($tbl.maxRows) { $tbl.maxRows } else { 60000 }

    Write-Host "  Exporting $name..." -NoNewline
    $rows = Get-TableRows $name $order $maxR
    Write-Host " $($rows.Count) rows"

    if ($rows.Count -gt 0) {
        $sql = "-- ---- $name ($($rows.Count) rows) ----`n"
        $sql += Rows-To-Insert $name $rows
        $sql += "`n"
        Add-Content -Path $SEED_FILE -Value $sql -Encoding UTF8
        $totalRows += $rows.Count
    } else {
        Write-Skip "$name returned 0 rows (RLS may block anon key)"
    }
}

$footer = "`nSET session_replication_role = 'origin';  -- restore FK checks`n"
Add-Content -Path $SEED_FILE -Value $footer -Encoding UTF8

$sizeKB = [math]::Round((Get-Item $SEED_FILE).Length / 1KB, 0)
Write-OK "Seed file written: $SEED_FILE ($sizeKB KB, ~$totalRows rows)"

# ---- Import into Docker ----
Write-Step "Importing into Docker container ($CONTAINER)..."
$status = docker inspect --format "{{.State.Health.Status}}" $CONTAINER 2>$null
if ($status -ne "healthy") { throw "Container $CONTAINER is not healthy. Run: docker compose up -d" }

Get-Content $SEED_FILE | docker exec -i $CONTAINER psql -U postgres -d $DB_NAME --quiet
if ($LASTEXITCODE -ne 0) { throw "psql import failed" }
Write-OK "Data imported into $DB_NAME"

# ---- Reset identity sequences ----
Write-Step "Resetting identity sequences..."
$seqSql = @"
DO `$`$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT seq.relname AS seq_name, tbl.relname AS tbl_name, att.attname AS col_name
    FROM   pg_class seq
    JOIN   pg_depend dep  ON dep.objid = seq.oid
    JOIN   pg_class tbl   ON tbl.oid   = dep.refobjid
    JOIN   pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = dep.refobjsubid
    WHERE  seq.relkind = 'S'
  LOOP
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))',
                   r.seq_name, r.col_name, r.tbl_name);
  END LOOP;
END `$`$;
"@
docker exec -i $CONTAINER psql -U postgres -d $DB_NAME -c $seqSql --quiet
Write-OK "Sequences reset"

# ---- Run backfill ----
Write-Step "Running backfill (03_backfill.sql)..."
Get-Content "$PSScriptRoot\03_backfill.sql" | docker exec -i $CONTAINER psql -U postgres -d $DB_NAME --quiet
Write-OK "Backfill complete"

# ---- Verify ----
Write-Step "Verification — row counts"
$verifySQL = @"
SELECT tablename,
       (xpath('/row/cnt/text()',
              query_to_xml(format('SELECT COUNT(*) AS cnt FROM public.%I', tablename),
                           true, false, '')))[1]::text::int AS rows
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER  BY tablename;
"@
docker exec -i $CONTAINER psql -U postgres -d $DB_NAME -c $verifySQL

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  Seed import complete!" -ForegroundColor Green
Write-Host "  Local DB : postgresql://postgres:localpass123@localhost:5432/rigga_local" -ForegroundColor Green
Write-Host "  REST API : http://localhost:54321/rest/v1/" -ForegroundColor Green
Write-Host "  pgAdmin  : http://localhost:5050  (admin@local.com / admin123)" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Green
