-- ================================================================
-- Add 'chef' as a valid staff role
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- Safe if the staff table has no role check constraint (no-op).
-- If a constraint exists, drops and recreates it with chef added.
-- ================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_role_check'
      AND conrelid = 'staff'::regclass
  ) THEN
    ALTER TABLE staff DROP CONSTRAINT staff_role_check;
    ALTER TABLE staff ADD CONSTRAINT staff_role_check
      CHECK (role IN ('owner','manager','cashier','baker','bartender','waiter','chef'));
    RAISE NOTICE '✓ staff_role_check updated to include chef';
  ELSE
    RAISE NOTICE '✓ No role check constraint on staff — chef is already valid';
  END IF;
END $$;
