-- Drop transition table triggers
DROP TRIGGER IF EXISTS send_to_sheet_insert ON public.checklist;
DROP TRIGGER IF EXISTS send_to_sheet_update ON public.checklist;
DROP TRIGGER IF EXISTS send_to_sheet_delete ON public.checklist;
DROP TRIGGER IF EXISTS send_to_sheet ON public.checklist;

-- Drop new helper function
DROP FUNCTION IF EXISTS public.fn_sync_checklist_to_sheet_delete();

-- Restore original trigger function
CREATE OR REPLACE FUNCTION public.fn_sync_checklist_to_sheet()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://lmdxpwjwdioiukjhyfth.supabase.co/functions/v1/sync-checklist-sheet',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Restore original statement triggers
CREATE TRIGGER send_to_sheet
AFTER INSERT OR UPDATE ON public.checklist
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_sync_checklist_to_sheet();

CREATE TRIGGER send_to_sheet_delete
AFTER DELETE ON public.checklist
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_sync_checklist_to_sheet();
