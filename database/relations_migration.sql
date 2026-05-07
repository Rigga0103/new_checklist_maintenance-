-- ===========================================================================
-- relations_migration.sql
-- Adds proper FK relations to all task tables.
-- Strategy: ADD nullable FK columns alongside existing text columns.
--   - Zero downtime: all new columns are nullable, existing data untouched
--   - ON DELETE SET NULL: deleting a user/machine doesn't cascade-delete tasks
--   - Backfill queries populate the new FK columns from existing text data
--   - checklist_user_links / maintenance_user_links bridge tables are dropped
--     (they were never populated by the app and are replaced by direct FKs)
-- ===========================================================================


-- ===========================================================================
-- SECTION 1: unique_checklist (task templates for recurring checklist tasks)
-- Adds: assignee_user_id, created_by_user_id
-- ===========================================================================
ALTER TABLE public.unique_checklist
  ADD COLUMN IF NOT EXISTS assignee_user_id   BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_uc_assignee_user   ON public.unique_checklist(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_uc_created_by_user ON public.unique_checklist(created_by_user_id);


-- ===========================================================================
-- SECTION 2: checklist (generated task instances, one row per working day)
-- Adds: assignee_user_id, created_by_user_id, source_unique_id (template FK),
--       is_migrated, migrated_at, migrated_from_user_id
-- ===========================================================================
ALTER TABLE public.checklist
  ADD COLUMN IF NOT EXISTS assignee_user_id       BIGINT      REFERENCES public.users(id)             ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id     BIGINT      REFERENCES public.users(id)             ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_unique_id       BIGINT      REFERENCES public.unique_checklist(task_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_migrated            BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS migrated_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS migrated_from_user_id  BIGINT      REFERENCES public.users(id)             ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checklist_assignee        ON public.checklist(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_created_by      ON public.checklist(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_source_unique   ON public.checklist(source_unique_id);
CREATE INDEX IF NOT EXISTS idx_checklist_is_migrated     ON public.checklist(is_migrated) WHERE is_migrated = true;


-- ===========================================================================
-- SECTION 3: delegation (one-time tasks, frequency = 'one-time')
-- Adds: assignee_user_id, created_by_user_id
-- ===========================================================================
ALTER TABLE public.delegation
  ADD COLUMN IF NOT EXISTS assignee_user_id   BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delegation_assignee    ON public.delegation(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_delegation_created_by  ON public.delegation(created_by_user_id);


-- ===========================================================================
-- SECTION 4: unique_maintanence (task templates for maintenance)
-- Adds: assignee_user_id, created_by_user_id
-- ===========================================================================
ALTER TABLE public.unique_maintanence
  ADD COLUMN IF NOT EXISTS assignee_user_id   BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_um_assignee_user   ON public.unique_maintanence(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_um_created_by_user ON public.unique_maintanence(created_by_user_id);


-- ===========================================================================
-- SECTION 5: machine_maintenance (generated maintenance task instances)
-- Adds: assignee_user_id, created_by_user_id, source_unique_id (template FK),
--       machine_id (FK to machines), is_migrated, migrated_at, migrated_from_user_id
-- ===========================================================================
ALTER TABLE public.machine_maintenance
  ADD COLUMN IF NOT EXISTS assignee_user_id      BIGINT      REFERENCES public.users(id)               ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id    BIGINT      REFERENCES public.users(id)               ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_unique_id      BIGINT      REFERENCES public.unique_maintanence(task_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS machine_id            BIGINT      REFERENCES public.machines(id)             ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_migrated           BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS migrated_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS migrated_from_user_id BIGINT      REFERENCES public.users(id)               ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mm_assignee_user   ON public.machine_maintenance(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_mm_created_by      ON public.machine_maintenance(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_mm_source_unique   ON public.machine_maintenance(source_unique_id);
CREATE INDEX IF NOT EXISTS idx_mm_machine_id      ON public.machine_maintenance(machine_id);
CREATE INDEX IF NOT EXISTS idx_mm_is_migrated     ON public.machine_maintenance(is_migrated) WHERE is_migrated = true;


-- ===========================================================================
-- SECTION 6: machine_repair (repair requests)
-- Adds: assignee_user_id (for assigned_to), reported_by_user_id (for form_filled_by),
--       machine_id (FK to machines)
-- ===========================================================================
ALTER TABLE public.machine_repair
  ADD COLUMN IF NOT EXISTS assignee_user_id    BIGINT REFERENCES public.users(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reported_by_user_id BIGINT REFERENCES public.users(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS machine_id          BIGINT REFERENCES public.machines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mr_assignee_user    ON public.machine_repair(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_mr_reported_by_user ON public.machine_repair(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_mr_machine_id       ON public.machine_repair(machine_id);


-- ===========================================================================
-- SECTION 7: maintenance_schedules (recurring maintenance schedule templates)
-- Adds: assignee_user_id, machine_id
-- ===========================================================================
ALTER TABLE public.maintenance_schedules
  ADD COLUMN IF NOT EXISTS assignee_user_id BIGINT REFERENCES public.users(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS machine_id       BIGINT REFERENCES public.machines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ms_assignee_user ON public.maintenance_schedules(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_ms_machine_id    ON public.maintenance_schedules(machine_id);


-- ===========================================================================
-- SECTION 8: Drop unused bridge tables
-- checklist_user_links and maintenance_user_links were created in the schema
-- but the application code never inserts into them. They are replaced by the
-- direct FK columns added above. Drop them if they exist.
-- ===========================================================================
DROP TABLE IF EXISTS public.checklist_user_links;
DROP TABLE IF EXISTS public.maintenance_user_links;


-- ===========================================================================
-- SECTION 9: Backfill — populate FK columns from existing text data
-- All done with case-insensitive TRIM matching so "  ritu sahu  " = "Ritu Sahu"
-- ===========================================================================

-- unique_checklist.assignee_user_id ← match by name column
UPDATE public.unique_checklist uc
SET    assignee_user_id = u.id
FROM   public.users u
WHERE  LOWER(TRIM(uc.name)) = LOWER(TRIM(u.user_name))
  AND  u.user_name IS NOT NULL
  AND  uc.assignee_user_id IS NULL;

-- checklist.assignee_user_id ← match by name column
UPDATE public.checklist c
SET    assignee_user_id = u.id
FROM   public.users u
WHERE  LOWER(TRIM(c.name)) = LOWER(TRIM(u.user_name))
  AND  u.user_name IS NOT NULL
  AND  c.assignee_user_id IS NULL;

-- checklist.source_unique_id ← match by task_description + name (template linkage)
UPDATE public.checklist c
SET    source_unique_id = uc.task_id
FROM   public.unique_checklist uc
WHERE  LOWER(TRIM(c.task_description)) = LOWER(TRIM(uc.task_description))
  AND  LOWER(TRIM(c.name))             = LOWER(TRIM(uc.name))
  AND  c.source_unique_id IS NULL;

-- delegation.assignee_user_id ← match by name column
UPDATE public.delegation d
SET    assignee_user_id = u.id
FROM   public.users u
WHERE  LOWER(TRIM(d.name)) = LOWER(TRIM(u.user_name))
  AND  u.user_name IS NOT NULL
  AND  d.assignee_user_id IS NULL;

-- unique_maintanence.assignee_user_id ← match by name column
UPDATE public.unique_maintanence um
SET    assignee_user_id = u.id
FROM   public.users u
WHERE  LOWER(TRIM(um.name)) = LOWER(TRIM(u.user_name))
  AND  u.user_name IS NOT NULL
  AND  um.assignee_user_id IS NULL;

-- machine_maintenance.assignee_user_id ← match by doer_name column
UPDATE public.machine_maintenance mm
SET    assignee_user_id = u.id
FROM   public.users u
WHERE  LOWER(TRIM(mm.doer_name)) = LOWER(TRIM(u.user_name))
  AND  u.user_name IS NOT NULL
  AND  mm.assignee_user_id IS NULL;

-- machine_maintenance.source_unique_id ← match by task_description + machine_name
UPDATE public.machine_maintenance mm
SET    source_unique_id = um.task_id
FROM   public.unique_maintanence um
WHERE  LOWER(TRIM(mm.task_description)) = LOWER(TRIM(um.task_description))
  AND  LOWER(TRIM(mm.machine_name))     = LOWER(TRIM(um.machine_name))
  AND  mm.source_unique_id IS NULL;

-- machine_maintenance.machine_id ← match by machine_name
UPDATE public.machine_maintenance mm
SET    machine_id = m.id
FROM   public.machines m
WHERE  LOWER(TRIM(mm.machine_name)) = LOWER(TRIM(m.machine_name))
  AND  mm.machine_id IS NULL;

-- machine_repair.assignee_user_id ← match by assigned_to column
UPDATE public.machine_repair r
SET    assignee_user_id = u.id
FROM   public.users u
WHERE  LOWER(TRIM(r.assigned_to)) = LOWER(TRIM(u.user_name))
  AND  u.user_name IS NOT NULL
  AND  r.assignee_user_id IS NULL;

-- machine_repair.reported_by_user_id ← match by form_filled_by column
UPDATE public.machine_repair r
SET    reported_by_user_id = u.id
FROM   public.users u
WHERE  LOWER(TRIM(r.form_filled_by)) = LOWER(TRIM(u.user_name))
  AND  u.user_name IS NOT NULL
  AND  r.reported_by_user_id IS NULL;

-- machine_repair.machine_id ← match by machine_name
UPDATE public.machine_repair r
SET    machine_id = m.id
FROM   public.machines m
WHERE  LOWER(TRIM(r.machine_name)) = LOWER(TRIM(m.machine_name))
  AND  r.machine_id IS NULL;

-- maintenance_schedules.assignee_user_id ← match by assigned_to column
UPDATE public.maintenance_schedules ms
SET    assignee_user_id = u.id
FROM   public.users u
WHERE  LOWER(TRIM(ms.assigned_to)) = LOWER(TRIM(u.user_name))
  AND  u.user_name IS NOT NULL
  AND  ms.assignee_user_id IS NULL;

-- maintenance_schedules.machine_id ← match by machine_name
UPDATE public.maintenance_schedules ms
SET    machine_id = m.id
FROM   public.machines m
WHERE  LOWER(TRIM(ms.machine_name)) = LOWER(TRIM(m.machine_name))
  AND  ms.machine_id IS NULL;


-- ===========================================================================
-- SECTION 10: Verification queries (run manually after migration)
-- ===========================================================================
/*
-- How many checklist rows got assignee_user_id populated?
SELECT
  COUNT(*)                                              AS total,
  COUNT(assignee_user_id)                               AS with_user_id,
  ROUND(COUNT(assignee_user_id)::numeric / COUNT(*) * 100, 1) AS pct_matched
FROM public.checklist;

-- How many checklist rows got source_unique_id populated?
SELECT COUNT(*) AS total, COUNT(source_unique_id) AS with_source
FROM public.checklist;

-- machine_maintenance match rate
SELECT
  COUNT(*) AS total,
  COUNT(assignee_user_id) AS with_user_id,
  COUNT(machine_id) AS with_machine_id
FROM public.machine_maintenance;

-- Names in checklist that did NOT match any user (spelling mismatches to fix)
SELECT DISTINCT c.name
FROM public.checklist c
LEFT JOIN public.users u ON LOWER(TRIM(c.name)) = LOWER(TRIM(u.user_name))
WHERE u.id IS NULL AND c.name IS NOT NULL
ORDER BY c.name;
*/
