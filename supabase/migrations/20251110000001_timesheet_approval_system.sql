-- Add timesheet approval fields to time_entries table
-- This enables the timesheet approval workflow for construction field workers

-- Add approval status and tracking columns
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'submitted')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add index for faster approval queue queries
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status ON time_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by ON time_entries(approved_by);
CREATE INDEX IF NOT EXISTS idx_time_entries_submitted_at ON time_entries(submitted_at);

-- Create timesheet approval history table for audit trail
CREATE TABLE IF NOT EXISTS timesheet_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'reopened')),
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for history queries
CREATE INDEX IF NOT EXISTS idx_timesheet_approval_history_time_entry ON timesheet_approval_history(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_approval_history_performed_by ON timesheet_approval_history(performed_by);

-- Function to automatically log approval history
CREATE OR REPLACE FUNCTION log_timesheet_approval_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if approval_status changed
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO timesheet_approval_history (
      time_entry_id,
      action,
      performed_by,
      notes,
      previous_status,
      new_status
    ) VALUES (
      NEW.id,
      NEW.approval_status,
      NEW.approved_by,
      COALESCE(NEW.approval_notes, NEW.rejection_reason),
      OLD.approval_status,
      NEW.approval_status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for approval history
DROP TRIGGER IF EXISTS trigger_log_timesheet_approval_history ON time_entries;
CREATE TRIGGER trigger_log_timesheet_approval_history
  AFTER UPDATE ON time_entries
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION log_timesheet_approval_history();

-- Create view for pending timesheet approvals (for approval queue)
CREATE OR REPLACE VIEW pending_timesheet_approvals AS
SELECT
  te.id,
  te.user_id,
  te.project_id,
  te.start_time,
  te.end_time,
  te.total_hours,
  te.break_duration,
  te.description,
  te.location,
  te.approval_status,
  te.submitted_at,
  te.created_at,
  CONCAT(up.first_name, ' ', up.last_name) as worker_name,
  up.email as worker_email,
  p.name as project_name,
  p.site_address as project_location,
  cc.code as cost_code,
  cc.description as cost_code_description
FROM time_entries te
LEFT JOIN user_profiles up ON te.user_id = up.id
LEFT JOIN projects p ON te.project_id = p.id
LEFT JOIN cost_codes cc ON te.cost_code_id = cc.id
WHERE te.approval_status IN ('pending', 'submitted')
ORDER BY te.submitted_at DESC NULLS LAST, te.created_at DESC;

-- Create view for approved timesheets (for reporting)
CREATE OR REPLACE VIEW approved_timesheets AS
SELECT
  te.id,
  te.user_id,
  te.project_id,
  te.start_time,
  te.end_time,
  te.total_hours,
  te.break_duration,
  te.description,
  te.location,
  te.approval_status,
  te.approved_by,
  te.approved_at,
  te.approval_notes,
  CONCAT(up.first_name, ' ', up.last_name) as worker_name,
  up.email as worker_email,
  CONCAT(approver.first_name, ' ', approver.last_name) as approver_name,
  p.name as project_name,
  cc.code as cost_code
FROM time_entries te
LEFT JOIN user_profiles up ON te.user_id = up.id
LEFT JOIN user_profiles approver ON te.approved_by = approver.id
LEFT JOIN projects p ON te.project_id = p.id
LEFT JOIN cost_codes cc ON te.cost_code_id = cc.id
WHERE te.approval_status = 'approved'
ORDER BY te.approved_at DESC;

-- Function to bulk approve timesheets
CREATE OR REPLACE FUNCTION bulk_approve_timesheets(
  timesheet_ids UUID[],
  approver_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS TABLE(success_count INT, failed_count INT) AS $$
DECLARE
  success INT := 0;
  failed INT := 0;
  timesheet_id UUID;
BEGIN
  FOREACH timesheet_id IN ARRAY timesheet_ids
  LOOP
    BEGIN
      UPDATE time_entries
      SET
        approval_status = 'approved',
        approved_by = approver_id,
        approved_at = now(),
        approval_notes = notes
      WHERE id = timesheet_id
        AND approval_status IN ('pending', 'submitted');

      IF FOUND THEN
        success := success + 1;
      ELSE
        failed := failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT success, failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk reject timesheets
CREATE OR REPLACE FUNCTION bulk_reject_timesheets(
  timesheet_ids UUID[],
  rejector_id UUID,
  rejection_reason TEXT
)
RETURNS TABLE(success_count INT, failed_count INT) AS $$
DECLARE
  success INT := 0;
  failed INT := 0;
  timesheet_id UUID;
BEGIN
  FOREACH timesheet_id IN ARRAY timesheet_ids
  LOOP
    BEGIN
      UPDATE time_entries
      SET
        approval_status = 'rejected',
        approved_by = rejector_id,
        approved_at = now(),
        rejection_reason = rejection_reason
      WHERE id = timesheet_id
        AND approval_status IN ('pending', 'submitted');

      IF FOUND THEN
        success := success + 1;
      ELSE
        failed := failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT success, failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON pending_timesheet_approvals TO authenticated;
GRANT SELECT ON approved_timesheets TO authenticated;
GRANT SELECT ON timesheet_approval_history TO authenticated;

-- Add RLS policies for timesheet approval
ALTER TABLE timesheet_approval_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own approval history"
  ON timesheet_approval_history
  FOR SELECT
  USING (
    performed_by = auth.uid()
    OR
    time_entry_id IN (
      SELECT id FROM time_entries WHERE user_id = auth.uid()
    )
  );

-- Comment on new columns
COMMENT ON COLUMN time_entries.approval_status IS 'Status of timesheet approval: pending (default), submitted (ready for approval), approved, rejected';
COMMENT ON COLUMN time_entries.approved_by IS 'User ID of person who approved/rejected the timesheet';
COMMENT ON COLUMN time_entries.approved_at IS 'Timestamp when timesheet was approved/rejected';
COMMENT ON COLUMN time_entries.rejection_reason IS 'Reason provided when timesheet was rejected';
COMMENT ON COLUMN time_entries.submitted_at IS 'Timestamp when worker submitted timesheet for approval';
COMMENT ON COLUMN time_entries.approval_notes IS 'Notes added by approver';
