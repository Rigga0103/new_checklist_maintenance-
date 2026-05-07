# ============================================================
# migrate.ps1  —  Full data migration: Supabase → local Docker
# ============================================================
# Usage:
#   .\database\migrate.ps1 -DbPassword "your_supabase_db_password"
#
# Get the DB password from:
#   Supabase Dashboard → Project Settings → Database → Connection string
#   (it's the password in the URI, NOT the anon/service-role JWT key)
# ============================================================

param(
  [Parameter(Mandatory = $true)]
  [string]$DbPassword
)

$ErrorActionPreference = "Stop"

$PROJECT_REF  = "shgloxculzfaghlirxxy"
$SUPABASE_DB  = "postgresql://postgres.${PROJECT_REF}:${DbPassword}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
$LOCAL_DB     = "postgresql://postgres:localpass123@localhost:5433/rigga_local"
$DUMP_FILE    = "$PSScriptRoot\supabase_data_dump.sql"
$CONTAINER    = "rigga_postgres"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    !! $msg"  -ForegroundColor Yellow }

# ---- Step 1: Check Docker is running ----------------------
Write-Step "Checking Docker..."
docker info | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker is not running. Start Docker Desktop first." }

# ---- Step 2: Check container is healthy -------------------
Write-Step "Checking Postgres container ($CONTAINER)..."
$status = docker inspect --format "{{.State.Health.Status}}" $CONTAINER 2>$null
if ($status -ne "healthy") {
    Write-Warn "Container not healthy (status: $status). Starting docker compose..."
    Set-Location $PSScriptRoot\..
    docker compose up -d
    Write-Host "    Waiting for health check..." -NoNewline
    $tries = 0
    do {
        Start-Sleep 3
        $status = docker inspect --format "{{.State.Health.Status}}" $CONTAINER 2>$null
        Write-Host "." -NoNewline
        $tries++
    } while ($status -ne "healthy" -and $tries -lt 20)
    Write-Host ""
    if ($status -ne "healthy") { throw "Postgres did not become healthy after 60s." }
}
Write-OK "Container is healthy"

# ---- Step 3: pg_dump from Supabase (runs inside Docker) ---
Write-Step "Dumping data from Supabase (this may take 2-5 minutes for 56K rows)..."
docker run --rm `
    postgres:16 `
    pg_dump `
    $SUPABASE_DB `
    --no-owner --no-acl `
    --schema=public `
    --data-only `
    --disable-triggers `
    | Out-File -FilePath $DUMP_FILE -Encoding UTF8

if (-not (Test-Path $DUMP_FILE) -or (Get-Item $DUMP_FILE).Length -lt 1000) {
    throw "Dump file is missing or too small. Check your DB password and network."
}
$sizeMB = [math]::Round((Get-Item $DUMP_FILE).Length / 1MB, 1)
Write-OK "Dump saved to $DUMP_FILE ($sizeMB MB)"

# ---- Step 4: Import data into Docker ----------------------
Write-Step "Importing data into local Docker Postgres..."
Get-Content $DUMP_FILE | docker exec -i $CONTAINER `
    psql -U postgres -d rigga_local --quiet

if ($LASTEXITCODE -ne 0) { throw "psql import failed." }
Write-OK "Data imported"

# ---- Step 5: Fix identity sequences -----------------------
Write-Step "Resetting identity sequences..."
$seqSql = @"
DO `$`$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT seq.relname AS seq_name,
           tbl.relname AS tbl_name,
           att.attname AS col_name
    FROM   pg_class seq
    JOIN   pg_depend dep  ON dep.objid = seq.oid
    JOIN   pg_class tbl   ON tbl.oid   = dep.refobjid
    JOIN   pg_attribute att ON att.attrelid = tbl.oid
                            AND att.attnum  = dep.refobjsubid
    WHERE  seq.relkind = 'S'
  LOOP
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))',
                   r.seq_name, r.col_name, r.tbl_name);
  END LOOP;
END `$`$;
"@
docker exec -i $CONTAINER psql -U postgres -d rigga_local -c $seqSql --quiet
Write-OK "Sequences reset"

# ---- Step 6: Run backfill ---------------------------------
Write-Step "Running backfill to populate new tables..."
Get-Content "$PSScriptRoot\03_backfill.sql" | docker exec -i $CONTAINER `
    psql -U postgres -d rigga_local --quiet
Write-OK "Backfill complete"

# ---- Step 7: Verification ---------------------------------
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
docker exec -i $CONTAINER psql -U postgres -d rigga_local -c $verifySQL

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  Migration complete!" -ForegroundColor Green
Write-Host "  Local DB : postgresql://postgres:localpass123@localhost:5432/rigga_local" -ForegroundColor Green
Write-Host "  pgAdmin  : http://localhost:5050  (admin@local.com / admin123)" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Green
