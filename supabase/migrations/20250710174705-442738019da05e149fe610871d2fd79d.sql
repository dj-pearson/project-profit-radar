-- =========================================
-- QUICKBOOKS DATA ROUTING SYSTEM
-- =========================================
-- This migration creates a comprehensive routing system for QuickBooks data
-- to automatically and manually assign transactions to specific projects

-- Routing rule field types
CREATE TYPE public.qb_field_type AS ENUM (
  'memo',
  'reference',
  'customer_name',
  'vendor_name',
  'item_name',
  'amount_range',
  'custom_field',
  'class',
  'location',
  'department'
);

-- Routing rule match types
CREATE TYPE public.qb_match_type AS ENUM (
  'exact',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
  'range',
  'in_list'
);

-- Transaction types from QuickBooks
CREATE TYPE public.qb_transaction_type AS ENUM (
  'expense',
  'check',
  'bill',
  'invoice',
  'sales_receipt',
  'credit_memo',
  'vendor_credit',
  'journal_entry',
  'payment',
  'bill_payment',
  'deposit',
  'transfer'
);

-- Routing status for tracking
CREATE TYPE public.routing_status AS ENUM (
  'unrouted',
  'auto_matched',
  'manually_assigned',
  'review_needed',
  'rejected'
);

-- =========================================
-- QUICKBOOKS ROUTING RULES TABLE
-- =========================================
CREATE TABLE public.quickbooks_routing_rules (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Rule Identification
  name text NOT NULL,
  description text,
  
  -- Matching Configuration
  field_type public.qb_field_type NOT NULL,
  field_name text NOT NULL, -- Specific field name for custom fields
  match_type public.qb_match_type NOT NULL,
  match_value text NOT NULL, -- The value/pattern to match
  
  -- Routing Target
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  
  -- Rule Behavior
  priority integer NOT NULL DEFAULT 1, -- Higher number = higher priority
  is_active boolean NOT NULL DEFAULT true,
  auto_assign boolean NOT NULL DEFAULT false, -- Automatically assign without review
  confidence_threshold integer DEFAULT 80, -- Minimum confidence to auto-assign
  
  -- Transaction Filters
  transaction_types public.qb_transaction_type[], -- Which transaction types this rule applies to
  amount_min decimal(12,2), -- Minimum amount filter
  amount_max decimal(12,2), -- Maximum amount filter
  date_range_start date, -- Optional date range filter
  date_range_end date,
  
  -- Advanced Matching
  case_sensitive boolean DEFAULT false,
  whole_word_only boolean DEFAULT false,
  exclude_patterns text[], -- Patterns that exclude a match
  
  -- Performance Tracking
  matches_count integer DEFAULT 0,
  success_rate decimal(5,2) DEFAULT 0.00,
  last_matched_at timestamp with time zone,
  
  -- Audit Fields
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT routing_rules_priority_positive CHECK (priority > 0),
  CONSTRAINT routing_rules_confidence_range CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100),
  CONSTRAINT routing_rules_amount_range CHECK (amount_min IS NULL OR amount_max IS NULL OR amount_min <= amount_max)
);

-- =========================================
-- QUICKBOOKS UNROUTED TRANSACTIONS TABLE
-- =========================================
CREATE TABLE public.quickbooks_unrouted_transactions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- QuickBooks Transaction Data
  qb_transaction_id text NOT NULL, -- QuickBooks transaction ID
  qb_transaction_type public.qb_transaction_type NOT NULL,
  
  -- Transaction Details
  description text,
  memo text,
  reference_number text,
  amount decimal(12,2) NOT NULL,
  transaction_date date NOT NULL,
  
  -- Entity Information
  customer_id uuid REFERENCES public.quickbooks_customers(id),
  customer_name text,
  vendor_name text,
  employee_name text,
  
  -- QuickBooks Specific Data
  qb_class text, -- QuickBooks class field
  qb_location text, -- QuickBooks location field
  qb_department text, -- QuickBooks department field
  qb_custom_fields jsonb, -- Additional custom fields from QB
  
  -- Line Item Details (for multi-line transactions)
  line_items jsonb, -- Array of line items with their own routing needs
  
  -- Routing Status
  routing_status public.routing_status NOT NULL DEFAULT 'unrouted',
  
  -- Suggested Assignment (from auto-routing)
  suggested_project_id uuid REFERENCES public.projects(id),
  suggested_cost_code_id uuid REFERENCES public.cost_codes(id),
  suggestion_confidence decimal(5,2), -- 0-100 confidence score
  suggestion_reason text, -- Why this project was suggested
  matched_rule_id uuid REFERENCES public.quickbooks_routing_rules(id),
  
  -- Manual Assignment
  assigned_project_id uuid REFERENCES public.projects(id),
  assigned_cost_code_id uuid REFERENCES public.cost_codes(id),
  assigned_by uuid REFERENCES public.user_profiles(id),
  assigned_at timestamp with time zone,
  assignment_notes text,
  
  -- Review Status
  needs_review boolean DEFAULT false,
  review_reason text,
  reviewed_by uuid REFERENCES public.user_profiles(id),
  reviewed_at timestamp with time zone,
  
  -- Sync Status
  synced_to_project boolean DEFAULT false,
  sync_error text,
  last_sync_attempt timestamp with time zone,
  
  -- Audit Fields
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unrouted_transactions_qb_company_unique UNIQUE (qb_transaction_id, company_id),
  CONSTRAINT unrouted_transactions_confidence_range CHECK (suggestion_confidence IS NULL OR (suggestion_confidence >= 0 AND suggestion_confidence <= 100))
);

-- =========================================
-- QUICKBOOKS ROUTING HISTORY TABLE
-- =========================================
CREATE TABLE public.quickbooks_routing_history (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Transaction Reference
  transaction_id uuid REFERENCES public.quickbooks_unrouted_transactions(id) ON DELETE CASCADE,
  qb_transaction_id text NOT NULL,
  
  -- Routing Event
  event_type text NOT NULL, -- 'auto_matched', 'manually_assigned', 'rule_applied', 'rejected', 'reviewed'
  
  -- Assignment Details
  from_project_id uuid REFERENCES public.projects(id),
  to_project_id uuid REFERENCES public.projects(id),
  from_cost_code_id uuid REFERENCES public.cost_codes(id),
  to_cost_code_id uuid REFERENCES public.cost_codes(id),
  
  -- Rule Information
  applied_rule_id uuid REFERENCES public.quickbooks_routing_rules(id),
  rule_name text,
  confidence_score decimal(5,2),
  
  -- User Action
  performed_by uuid REFERENCES public.user_profiles(id),
  notes text,
  
  -- Timing
  event_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Additional Data
  metadata jsonb -- Additional context data
);

-- =========================================
-- QUICKBOOKS ROUTING ANALYTICS TABLE
-- =========================================
CREATE TABLE public.quickbooks_routing_analytics (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Time Period
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Volume Metrics
  total_transactions integer DEFAULT 0,
  auto_routed_transactions integer DEFAULT 0,
  manually_routed_transactions integer DEFAULT 0,
  unrouted_transactions integer DEFAULT 0,
  
  -- Performance Metrics
  auto_routing_accuracy decimal(5,2) DEFAULT 0.00, -- % of auto-routes that were accepted
  average_confidence_score decimal(5,2) DEFAULT 0.00,
  average_processing_time interval, -- Time from import to assignment
  
  -- Rule Performance
  most_effective_rule_id uuid REFERENCES public.quickbooks_routing_rules(id),
  least_effective_rule_id uuid REFERENCES public.quickbooks_routing_rules(id),
  
  -- Financial Impact
  total_transaction_value decimal(12,2) DEFAULT 0.00,
  auto_routed_value decimal(12,2) DEFAULT 0.00,
  time_saved_hours decimal(8,2) DEFAULT 0.00, -- Estimated time saved by auto-routing
  
  -- Quality Metrics
  rejection_rate decimal(5,2) DEFAULT 0.00, -- % of suggestions rejected
  review_rate decimal(5,2) DEFAULT 0.00, -- % requiring manual review
  
  -- Generated Fields
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =========================================
-- INDEXES for performance optimization
-- =========================================

-- Routing Rules indexes
CREATE INDEX idx_qb_routing_rules_company_active ON public.quickbooks_routing_rules(company_id, is_active);
CREATE INDEX idx_qb_routing_rules_priority ON public.quickbooks_routing_rules(priority DESC);
CREATE INDEX idx_qb_routing_rules_field_type ON public.quickbooks_routing_rules(field_type);
CREATE INDEX idx_qb_routing_rules_project ON public.quickbooks_routing_rules(project_id);

-- Unrouted Transactions indexes
CREATE INDEX idx_qb_unrouted_company_status ON public.quickbooks_unrouted_transactions(company_id, routing_status);
CREATE INDEX idx_qb_unrouted_transaction_date ON public.quickbooks_unrouted_transactions(transaction_date);
CREATE INDEX idx_qb_unrouted_amount ON public.quickbooks_unrouted_transactions(amount);
CREATE INDEX idx_qb_unrouted_qb_id ON public.quickbooks_unrouted_transactions(qb_transaction_id);
CREATE INDEX idx_qb_unrouted_customer ON public.quickbooks_unrouted_transactions(customer_name);
CREATE INDEX idx_qb_unrouted_vendor ON public.quickbooks_unrouted_transactions(vendor_name);
CREATE INDEX idx_qb_unrouted_suggested_project ON public.quickbooks_unrouted_transactions(suggested_project_id);

-- History indexes
CREATE INDEX idx_qb_routing_history_company ON public.quickbooks_routing_history(company_id);
CREATE INDEX idx_qb_routing_history_transaction ON public.quickbooks_routing_history(transaction_id);
CREATE INDEX idx_qb_routing_history_event_type ON public.quickbooks_routing_history(event_type);
CREATE INDEX idx_qb_routing_history_timestamp ON public.quickbooks_routing_history(event_timestamp);

-- Analytics indexes
CREATE INDEX idx_qb_routing_analytics_company_period ON public.quickbooks_routing_analytics(company_id, period_start, period_end);

-- =========================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE public.quickbooks_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_unrouted_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_routing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_routing_analytics ENABLE ROW LEVEL SECURITY;

-- Routing Rules RLS Policies
CREATE POLICY "Users can view company routing rules"
ON public.quickbooks_routing_rules
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

CREATE POLICY "Authorized users can manage routing rules"
ON public.quickbooks_routing_rules
FOR ALL
USING (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'accounting', 'root_admin'])
);

-- Unrouted Transactions RLS Policies
CREATE POLICY "Users can view company unrouted transactions"
ON public.quickbooks_unrouted_transactions
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

CREATE POLICY "Authorized users can manage unrouted transactions"
ON public.quickbooks_unrouted_transactions
FOR ALL
USING (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role_type(auth.uid()) = ANY (ARRAY['admin', 'project_manager', 'accounting', 'office_staff', 'root_admin'])
);

-- Routing History RLS Policies
CREATE POLICY "Users can view company routing history"
ON public.quickbooks_routing_history
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

CREATE POLICY "System can create routing history"
ON public.quickbooks_routing_history
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
);

-- Analytics RLS Policies
CREATE POLICY "Users can view company routing analytics"
ON public.quickbooks_routing_analytics
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  get_user_role_type(auth.uid()) = 'root_admin'
);

-- =========================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =========================================

CREATE TRIGGER update_qb_routing_rules_updated_at 
BEFORE UPDATE ON public.quickbooks_routing_rules 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qb_unrouted_transactions_updated_at 
BEFORE UPDATE ON public.quickbooks_unrouted_transactions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- UTILITY FUNCTIONS
-- =========================================

-- Function to apply routing rules to a transaction
CREATE OR REPLACE FUNCTION apply_routing_rules(
  p_company_id uuid,
  p_transaction_id uuid
) RETURNS TABLE(
  matched_rule_id uuid,
  suggested_project_id uuid,
  suggested_cost_code_id uuid,
  confidence_score decimal
) AS $$
DECLARE
  transaction_record record;
  rule_record record;
  match_found boolean;
  highest_confidence decimal := 0;
  best_match record;
BEGIN
  -- Get transaction details
  SELECT * INTO transaction_record
  FROM public.quickbooks_unrouted_transactions
  WHERE id = p_transaction_id AND company_id = p_company_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Loop through active rules ordered by priority
  FOR rule_record IN
    SELECT *
    FROM public.quickbooks_routing_rules
    WHERE company_id = p_company_id 
      AND is_active = true
      AND (transaction_types IS NULL OR transaction_record.qb_transaction_type = ANY(transaction_types))
      AND (amount_min IS NULL OR transaction_record.amount >= amount_min)
      AND (amount_max IS NULL OR transaction_record.amount <= amount_max)
    ORDER BY priority DESC
  LOOP
    match_found := false;
    
    -- Apply matching logic based on rule configuration
    CASE rule_record.field_type
      WHEN 'memo' THEN
        IF transaction_record.memo IS NOT NULL THEN
          CASE rule_record.match_type
            WHEN 'exact' THEN
              match_found := (CASE WHEN rule_record.case_sensitive THEN transaction_record.memo = rule_record.match_value
                                  ELSE lower(transaction_record.memo) = lower(rule_record.match_value) END);
            WHEN 'contains' THEN
              match_found := (CASE WHEN rule_record.case_sensitive THEN transaction_record.memo LIKE '%' || rule_record.match_value || '%'
                                  ELSE lower(transaction_record.memo) LIKE '%' || lower(rule_record.match_value) || '%' END);
            WHEN 'starts_with' THEN
              match_found := (CASE WHEN rule_record.case_sensitive THEN transaction_record.memo LIKE rule_record.match_value || '%'
                                  ELSE lower(transaction_record.memo) LIKE lower(rule_record.match_value) || '%' END);
            WHEN 'regex' THEN
              match_found := transaction_record.memo ~ rule_record.match_value;
          END CASE;
        END IF;
      
      WHEN 'customer_name' THEN
        IF transaction_record.customer_name IS NOT NULL THEN
          CASE rule_record.match_type
            WHEN 'exact' THEN
              match_found := (CASE WHEN rule_record.case_sensitive THEN transaction_record.customer_name = rule_record.match_value
                                  ELSE lower(transaction_record.customer_name) = lower(rule_record.match_value) END);
            WHEN 'contains' THEN
              match_found := (CASE WHEN rule_record.case_sensitive THEN transaction_record.customer_name LIKE '%' || rule_record.match_value || '%'
                                  ELSE lower(transaction_record.customer_name) LIKE '%' || lower(rule_record.match_value) || '%' END);
          END CASE;
        END IF;
      
      WHEN 'vendor_name' THEN
        IF transaction_record.vendor_name IS NOT NULL THEN
          CASE rule_record.match_type
            WHEN 'exact' THEN
              match_found := (CASE WHEN rule_record.case_sensitive THEN transaction_record.vendor_name = rule_record.match_value
                                  ELSE lower(transaction_record.vendor_name) = lower(rule_record.match_value) END);
            WHEN 'contains' THEN
              match_found := (CASE WHEN rule_record.case_sensitive THEN transaction_record.vendor_name LIKE '%' || rule_record.match_value || '%'
                                  ELSE lower(transaction_record.vendor_name) LIKE '%' || lower(rule_record.match_value) || '%' END);
          END CASE;
        END IF;
        
      WHEN 'amount_range' THEN
        IF rule_record.match_type = 'range' THEN
          -- Parse range format like "1000-5000"
          DECLARE
            range_parts text[];
            min_amount decimal;
            max_amount decimal;
          BEGIN
            range_parts := string_to_array(rule_record.match_value, '-');
            IF array_length(range_parts, 1) = 2 THEN
              min_amount := range_parts[1]::decimal;
              max_amount := range_parts[2]::decimal;
              match_found := transaction_record.amount >= min_amount AND transaction_record.amount <= max_amount;
            END IF;
          END;
        END IF;
    END CASE;
    
    -- Check exclude patterns
    IF match_found AND rule_record.exclude_patterns IS NOT NULL THEN
      FOR i IN 1..array_length(rule_record.exclude_patterns, 1) LOOP
        IF transaction_record.memo LIKE '%' || rule_record.exclude_patterns[i] || '%' OR
           transaction_record.description LIKE '%' || rule_record.exclude_patterns[i] || '%' THEN
          match_found := false;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    
    -- If match found and confidence is higher than current best
    IF match_found AND rule_record.confidence_threshold > highest_confidence THEN
      highest_confidence := rule_record.confidence_threshold;
      best_match := rule_record;
    END IF;
  END LOOP;
  
  -- Return best match if found
  IF best_match IS NOT NULL THEN
    RETURN QUERY SELECT 
      best_match.id,
      best_match.project_id,
      best_match.cost_code_id,
      highest_confidence;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to batch process unrouted transactions
CREATE OR REPLACE FUNCTION process_unrouted_transactions(p_company_id uuid)
RETURNS TABLE(
  processed_count integer,
  auto_assigned_count integer,
  review_required_count integer
) AS $$
DECLARE
  transaction_record record;
  rule_match record;
  processed integer := 0;
  auto_assigned integer := 0;
  review_required integer := 0;
BEGIN
  -- Process each unrouted transaction
  FOR transaction_record IN
    SELECT id FROM public.quickbooks_unrouted_transactions
    WHERE company_id = p_company_id AND routing_status = 'unrouted'
  LOOP
    processed := processed + 1;
    
    -- Apply routing rules
    SELECT * INTO rule_match
    FROM apply_routing_rules(p_company_id, transaction_record.id)
    LIMIT 1;
    
    IF rule_match IS NOT NULL THEN
      -- Update transaction with suggestion
      UPDATE public.quickbooks_unrouted_transactions
      SET 
        suggested_project_id = rule_match.suggested_project_id,
        suggested_cost_code_id = rule_match.suggested_cost_code_id,
        suggestion_confidence = rule_match.confidence_score,
        matched_rule_id = rule_match.matched_rule_id,
        routing_status = CASE 
          WHEN rule_match.confidence_score >= 90 THEN 'auto_matched'::routing_status
          ELSE 'review_needed'::routing_status
        END,
        needs_review = rule_match.confidence_score < 90,
        updated_at = now()
      WHERE id = transaction_record.id;
      
      IF rule_match.confidence_score >= 90 THEN
        auto_assigned := auto_assigned + 1;
      ELSE
        review_required := review_required + 1;
      END IF;
      
      -- Update rule statistics
      UPDATE public.quickbooks_routing_rules
      SET 
        matches_count = matches_count + 1,
        last_matched_at = now()
      WHERE id = rule_match.matched_rule_id;
      
      -- Log the event
      INSERT INTO public.quickbooks_routing_history (
        company_id,
        transaction_id,
        qb_transaction_id,
        event_type,
        to_project_id,
        to_cost_code_id,
        applied_rule_id,
        confidence_score,
        event_timestamp
      ) VALUES (
        p_company_id,
        transaction_record.id,
        (SELECT qb_transaction_id FROM public.quickbooks_unrouted_transactions WHERE id = transaction_record.id),
        'auto_matched',
        rule_match.suggested_project_id,
        rule_match.suggested_cost_code_id,
        rule_match.matched_rule_id,
        rule_match.confidence_score,
        now()
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT processed, auto_assigned, review_required;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- COMMENTS FOR DOCUMENTATION
-- =========================================

COMMENT ON TABLE public.quickbooks_routing_rules IS 'Configurable rules for automatically routing QuickBooks transactions to projects';
COMMENT ON TABLE public.quickbooks_unrouted_transactions IS 'QuickBooks transactions that need project assignment';
COMMENT ON TABLE public.quickbooks_routing_history IS 'Audit trail of all routing activities and decisions';
COMMENT ON TABLE public.quickbooks_routing_analytics IS 'Performance metrics and analytics for routing effectiveness';

COMMENT ON FUNCTION apply_routing_rules IS 'Applies all active routing rules to a transaction and returns best match';
COMMENT ON FUNCTION process_unrouted_transactions IS 'Batch processes all unrouted transactions for a company';

-- Migration completed successfully