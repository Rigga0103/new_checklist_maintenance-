-- ============================================================
-- 03_backfill.sql  —  POPULATE NEW TABLES FROM EXISTING DATA
-- Run AFTER data has been imported from Supabase.
-- Safe to run multiple times (ON CONFLICT DO UPDATE / DO NOTHING).
-- ============================================================

-- --------------------------------------------------------
-- C1. checklist_user_links from checklist.name → users.user_name
-- --------------------------------------------------------
INSERT INTO public.checklist_user_links (task_id, assignee_user_id)
SELECT c.task_id, u.id
FROM   public.checklist c
JOIN   public.users u
       ON LOWER(TRIM(c.name)) = LOWER(TRIM(u.user_name))
WHERE  u.user_name IS NOT NULL
ON CONFLICT (task_id) DO UPDATE
  SET assignee_user_id = EXCLUDED.assignee_user_id;

-- --------------------------------------------------------
-- C2. source_unique_id on existing checklist links
--     (match by task_description + name)
-- --------------------------------------------------------
UPDATE public.checklist_user_links cl
SET    source_unique_id = uc.task_id
FROM   public.checklist c
JOIN   public.unique_checklist uc
       ON  LOWER(TRIM(c.task_description)) = LOWER(TRIM(uc.task_description))
       AND LOWER(TRIM(c.name))             = LOWER(TRIM(uc.name))
WHERE  cl.task_id          = c.task_id
  AND  cl.source_unique_id IS NULL;

-- --------------------------------------------------------
-- C3. maintenance_user_links from machine_maintenance.doer_name → users.user_name
-- --------------------------------------------------------
INSERT INTO public.maintenance_user_links (task_id, assignee_user_id)
SELECT m.task_id, u.id
FROM   public.machine_maintenance m
JOIN   public.users u
       ON LOWER(TRIM(m.doer_name)) = LOWER(TRIM(u.user_name))
WHERE  u.user_name IS NOT NULL
ON CONFLICT (task_id) DO UPDATE
  SET assignee_user_id = EXCLUDED.assignee_user_id;

-- --------------------------------------------------------
-- C4. source_unique_id on maintenance links
-- --------------------------------------------------------
UPDATE public.maintenance_user_links ml
SET    source_unique_id = um.task_id
FROM   public.machine_maintenance m
JOIN   public.unique_maintanence um
       ON  LOWER(TRIM(m.task_description)) = LOWER(TRIM(um.task_description))
       AND LOWER(TRIM(m.doer_name))        = LOWER(TRIM(um.name))
WHERE  ml.task_id          = m.task_id
  AND  ml.source_unique_id IS NULL;

-- --------------------------------------------------------
-- C5. user_departments from users.user_access (text) → departments
-- --------------------------------------------------------
INSERT INTO public.user_departments (user_id, dept_id, is_primary)
SELECT u.id, d.id, true
FROM   public.users u
JOIN   public.departments d
       ON LOWER(TRIM(u.user_access)) = LOWER(TRIM(d.dept_name))
WHERE  u.user_name   IS NOT NULL
  AND  u.user_access IS NOT NULL
ON CONFLICT (user_id, dept_id) DO NOTHING;

-- --------------------------------------------------------
-- Verification counts (uncomment to check after running)
-- --------------------------------------------------------
-- SELECT 'checklist_user_links'  AS tbl, COUNT(*) AS total,
--        SUM(CASE WHEN assignee_user_id IS NOT NULL THEN 1 END) AS with_user,
--        SUM(CASE WHEN source_unique_id IS NOT NULL THEN 1 END) AS with_template
-- FROM public.checklist_user_links
-- UNION ALL
-- SELECT 'maintenance_user_links', COUNT(*),
--        SUM(CASE WHEN assignee_user_id IS NOT NULL THEN 1 END),
--        SUM(CASE WHEN source_unique_id IS NOT NULL THEN 1 END)
-- FROM public.maintenance_user_links
-- UNION ALL
-- SELECT 'user_departments', COUNT(*), COUNT(*), NULL
-- FROM public.user_departments;
