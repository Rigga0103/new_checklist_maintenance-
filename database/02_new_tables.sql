-- ============================================================
-- 02_new_tables.sql  —  NEW TABLES (additive, zero production risk)
-- Applied to Docker after 01_schema.sql.
-- When ready: apply ONLY this file to production via Supabase migration.
-- ============================================================

-- --------------------------------------------------------
-- departments  — master department list
-- Replaces the 7 NULL user_name placeholder rows in users (IDs 11-17).
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dept_name   TEXT        NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.departments (dept_name) VALUES
  ('Production'),
  ('Quality'),
  ('Maintenance'),
  ('Store'),
  ('HR'),
  ('Admin'),
  ('Finance'),
  ('IT'),
  ('Purchase'),
  ('Safety')
ON CONFLICT (dept_name) DO NOTHING;

-- --------------------------------------------------------
-- user_departments  — user ↔ department junction
-- One user can belong to multiple departments.
-- is_primary marks the user's main department for display.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_departments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dept_id    BIGINT      NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, dept_id)
);

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON public.user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept_id ON public.user_departments(dept_id);

-- --------------------------------------------------------
-- task_migration_log  — audit trail for task reassignment
-- Written to when admin migrates tasks from one user to another
-- (e.g., employee resigned, went on leave).
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_migration_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  migrated_at    TIMESTAMPTZ DEFAULT now(),
  migrated_by    TEXT        NOT NULL,
  from_user_id   BIGINT      REFERENCES public.users(id) ON DELETE SET NULL,
  to_user_id     BIGINT      REFERENCES public.users(id) ON DELETE SET NULL,
  from_user_name TEXT        NOT NULL,
  to_user_name   TEXT        NOT NULL,
  task_type      TEXT        NOT NULL CHECK (task_type IN ('checklist', 'maintenance', 'delegation')),
  tasks_migrated INTEGER     NOT NULL DEFAULT 0,
  reason         TEXT,
  task_ids       TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_migration_from_user ON public.task_migration_log(from_user_id);
CREATE INDEX IF NOT EXISTS idx_task_migration_to_user   ON public.task_migration_log(to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_migration_at        ON public.task_migration_log(migrated_at DESC);

-- --------------------------------------------------------
-- checklist_user_links  — bridge: checklist rows → users
-- Does NOT alter the existing checklist table.
-- assignee_user_id   = who the task is for  (FK → users)
-- created_by_user_id = which admin assigned (FK → users)
-- source_unique_id   = which template       (FK → unique_checklist)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checklist_user_links (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id             BIGINT      NOT NULL REFERENCES public.checklist(task_id) ON DELETE CASCADE,
  assignee_user_id    BIGINT      REFERENCES public.users(id)                ON DELETE SET NULL,
  created_by_user_id  BIGINT      REFERENCES public.users(id)                ON DELETE SET NULL,
  source_unique_id    BIGINT      REFERENCES public.unique_checklist(task_id) ON DELETE SET NULL,
  linked_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (task_id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_links_task_id   ON public.checklist_user_links(task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_links_assignee  ON public.checklist_user_links(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_links_creator   ON public.checklist_user_links(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_links_source    ON public.checklist_user_links(source_unique_id);

-- --------------------------------------------------------
-- maintenance_user_links  — bridge: machine_maintenance rows → users
-- Same pattern as checklist_user_links.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_user_links (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id             BIGINT      NOT NULL REFERENCES public.machine_maintenance(task_id) ON DELETE CASCADE,
  assignee_user_id    BIGINT      REFERENCES public.users(id)                  ON DELETE SET NULL,
  created_by_user_id  BIGINT      REFERENCES public.users(id)                  ON DELETE SET NULL,
  source_unique_id    BIGINT      REFERENCES public.unique_maintanence(task_id) ON DELETE SET NULL,
  linked_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (task_id)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_links_task_id   ON public.maintenance_user_links(task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_links_assignee  ON public.maintenance_user_links(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_links_creator   ON public.maintenance_user_links(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_links_source    ON public.maintenance_user_links(source_unique_id);
