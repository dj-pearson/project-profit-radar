export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_settings: {
        Row: {
          api_key_name: string
          blog_instructions: string | null
          created_at: string
          global_instructions: string | null
          id: string
          is_active: boolean
          model: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_key_name: string
          blog_instructions?: string | null
          created_at?: string
          global_instructions?: string | null
          id?: string
          is_active?: boolean
          model: string
          provider: string
          updated_at?: string
        }
        Update: {
          api_key_name?: string
          blog_instructions?: string | null
          created_at?: string
          global_instructions?: string | null
          id?: string
          is_active?: boolean
          model?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          company_id: string | null
          compliance_category: string | null
          created_at: string
          description: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          risk_level: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          company_id?: string | null
          compliance_category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          company_id?: string | null
          compliance_category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          body: string
          created_at: string
          created_by: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      change_orders: {
        Row: {
          amount: number
          change_order_number: string
          client_approved: boolean | null
          client_approved_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          internal_approved: boolean | null
          internal_approved_by: string | null
          internal_approved_date: string | null
          project_id: string
          reason: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          change_order_number: string
          client_approved?: boolean | null
          client_approved_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          internal_approved?: boolean | null
          internal_approved_by?: string | null
          internal_approved_date?: string | null
          project_id: string
          reason?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          change_order_number?: string
          client_approved?: boolean | null
          client_approved_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          internal_approved?: boolean | null
          internal_approved_by?: string | null
          internal_approved_date?: string | null
          project_id?: string
          reason?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          annual_revenue_range: string | null
          company_size: string | null
          created_at: string
          id: string
          industry_type: Database["public"]["Enums"]["industry_type"] | null
          license_numbers: string[] | null
          name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_end_date: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          annual_revenue_range?: string | null
          company_size?: string | null
          created_at?: string
          id?: string
          industry_type?: Database["public"]["Enums"]["industry_type"] | null
          license_numbers?: string[] | null
          name: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_end_date?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          annual_revenue_range?: string | null
          company_size?: string | null
          created_at?: string
          id?: string
          industry_type?: Database["public"]["Enums"]["industry_type"] | null
          license_numbers?: string[] | null
          name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_end_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          compliance_score: number | null
          created_at: string
          file_path: string | null
          findings: Json | null
          generated_by: string
          id: string
          recommendations: Json | null
          report_data: Json
          report_type: string
          reporting_period_end: string
          reporting_period_start: string
          risk_assessment: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          compliance_score?: number | null
          created_at?: string
          file_path?: string | null
          findings?: Json | null
          generated_by: string
          id?: string
          recommendations?: Json | null
          report_data: Json
          report_type: string
          reporting_period_end: string
          reporting_period_start: string
          risk_assessment?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          compliance_score?: number | null
          created_at?: string
          file_path?: string | null
          findings?: Json | null
          generated_by?: string
          id?: string
          recommendations?: Json | null
          report_data?: Json
          report_type?: string
          reporting_period_end?: string
          reporting_period_start?: string
          risk_assessment?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          company_id: string
          consent_given: boolean
          consent_method: string
          consent_source: string | null
          consent_type: string
          consent_version: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: unknown | null
          lawful_basis: string
          metadata: Json | null
          purpose: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          withdrawal_date: string | null
          withdrawal_method: string | null
        }
        Insert: {
          company_id: string
          consent_given: boolean
          consent_method: string
          consent_source?: string | null
          consent_type: string
          consent_version?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown | null
          lawful_basis: string
          metadata?: Json | null
          purpose: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          withdrawal_date?: string | null
          withdrawal_method?: string | null
        }
        Update: {
          company_id?: string
          consent_given?: boolean
          consent_method?: string
          consent_source?: string | null
          consent_type?: string
          consent_version?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown | null
          lawful_basis?: string
          metadata?: Json | null
          purpose?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          withdrawal_date?: string | null
          withdrawal_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_codes: {
        Row: {
          category: string | null
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      csp_violations: {
        Row: {
          blocked_uri: string | null
          column_number: number | null
          created_at: string
          document_uri: string | null
          id: string
          line_number: number | null
          original_policy: string | null
          source_file: string | null
          user_agent: string | null
          violated_directive: string | null
        }
        Insert: {
          blocked_uri?: string | null
          column_number?: number | null
          created_at?: string
          document_uri?: string | null
          id?: string
          line_number?: number | null
          original_policy?: string | null
          source_file?: string | null
          user_agent?: string | null
          violated_directive?: string | null
        }
        Update: {
          blocked_uri?: string | null
          column_number?: number | null
          created_at?: string
          document_uri?: string | null
          id?: string
          line_number?: number | null
          original_policy?: string | null
          source_file?: string | null
          user_agent?: string | null
          violated_directive?: string | null
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          created_at: string
          created_by: string | null
          crew_count: number | null
          date: string
          delays_issues: string | null
          equipment_used: string | null
          id: string
          materials_delivered: string | null
          photos: string[] | null
          project_id: string
          safety_incidents: string | null
          updated_at: string
          weather_conditions: string | null
          work_performed: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crew_count?: number | null
          date?: string
          delays_issues?: string | null
          equipment_used?: string | null
          id?: string
          materials_delivered?: string | null
          photos?: string[] | null
          project_id: string
          safety_incidents?: string | null
          updated_at?: string
          weather_conditions?: string | null
          work_performed?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crew_count?: number | null
          date?: string
          delays_issues?: string | null
          equipment_used?: string | null
          id?: string
          materials_delivered?: string | null
          photos?: string[] | null
          project_id?: string
          safety_incidents?: string | null
          updated_at?: string
          weather_conditions?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_logs: {
        Row: {
          access_method: string
          access_purpose: string | null
          company_id: string | null
          created_at: string
          data_classification: string
          data_type: string
          id: string
          ip_address: unknown | null
          lawful_basis: string | null
          resource_id: string
          resource_name: string | null
          retention_applied: boolean | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_method: string
          access_purpose?: string | null
          company_id?: string | null
          created_at?: string
          data_classification: string
          data_type: string
          id?: string
          ip_address?: unknown | null
          lawful_basis?: string | null
          resource_id: string
          resource_name?: string | null
          retention_applied?: boolean | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_method?: string
          access_purpose?: string | null
          company_id?: string | null
          created_at?: string
          data_classification?: string
          data_type?: string
          id?: string
          ip_address?: unknown | null
          lawful_basis?: string | null
          resource_id?: string
          resource_name?: string | null
          retention_applied?: boolean | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string
          data_category: string
          deletion_criteria: Json | null
          description: string
          exceptions: Json | null
          id: string
          is_active: boolean | null
          legal_basis: string
          retention_period_months: number
          review_date: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by: string
          data_category: string
          deletion_criteria?: Json | null
          description: string
          exceptions?: Json | null
          id?: string
          is_active?: boolean | null
          legal_basis: string
          retention_period_months: number
          review_date?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          data_category?: string
          deletion_criteria?: Json | null
          description?: string
          exceptions?: Json | null
          id?: string
          is_active?: boolean | null
          legal_basis?: string
          retention_period_months?: number
          review_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_retention_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_retention_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          actions_taken: Json | null
          assigned_to: string | null
          communication_log: Json | null
          company_id: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          internal_notes: string | null
          priority: string | null
          rejection_reason: string | null
          request_details: Json | null
          request_type: string
          requester_email: string
          requester_name: string | null
          response_data: Json | null
          status: string | null
          subject_user_id: string | null
          updated_at: string
          verification_method: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actions_taken?: Json | null
          assigned_to?: string | null
          communication_log?: Json | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          priority?: string | null
          rejection_reason?: string | null
          request_details?: Json | null
          request_type: string
          requester_email: string
          requester_name?: string | null
          response_data?: Json | null
          status?: string | null
          subject_user_id?: string | null
          updated_at?: string
          verification_method?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actions_taken?: Json | null
          assigned_to?: string | null
          communication_log?: Json | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          priority?: string | null
          rejection_reason?: string | null
          request_details?: Json | null
          request_type?: string
          requester_email?: string
          requester_name?: string | null
          response_data?: Json | null
          status?: string | null
          subject_user_id?: string | null
          updated_at?: string
          verification_method?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ddos_detection_logs: {
        Row: {
          attack_type: string
          confidence_score: number | null
          created_at: string
          detection_method: string
          endpoint_targets: string[] | null
          id: string
          mitigation_actions: Json | null
          request_count: number
          request_patterns: Json | null
          resolved_at: string | null
          severity: string
          source_ip: unknown
          time_window_seconds: number
          user_agent: string | null
        }
        Insert: {
          attack_type: string
          confidence_score?: number | null
          created_at?: string
          detection_method: string
          endpoint_targets?: string[] | null
          id?: string
          mitigation_actions?: Json | null
          request_count: number
          request_patterns?: Json | null
          resolved_at?: string | null
          severity: string
          source_ip: unknown
          time_window_seconds: number
          user_agent?: string | null
        }
        Update: {
          attack_type?: string
          confidence_score?: number | null
          created_at?: string
          detection_method?: string
          endpoint_targets?: string[] | null
          id?: string
          mitigation_actions?: Json | null
          request_count?: number
          request_patterns?: Json | null
          resolved_at?: string | null
          severity?: string
          source_ip?: unknown
          time_window_seconds?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          description: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_current_version: boolean | null
          name: string
          parent_document_id: string | null
          project_id: string | null
          updated_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean | null
          name: string
          parent_document_id?: string | null
          project_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean | null
          name?: string
          parent_document_id?: string | null
          project_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_access_control: {
        Row: {
          access_type: string
          auto_generated: boolean | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          ip_range: unknown | null
          is_active: boolean | null
          reason: string | null
          updated_at: string
        }
        Insert: {
          access_type: string
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address: unknown
          ip_range?: unknown | null
          is_active?: boolean | null
          reason?: string | null
          updated_at?: string
        }
        Update: {
          access_type?: string
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          ip_range?: unknown | null
          is_active?: boolean | null
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_access_control_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_costs: {
        Row: {
          cost_code_id: string
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          equipment_cost: number | null
          id: string
          labor_cost: number | null
          labor_hours: number | null
          material_cost: number | null
          other_cost: number | null
          project_id: string
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          cost_code_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          equipment_cost?: number | null
          id?: string
          labor_cost?: number | null
          labor_hours?: number | null
          material_cost?: number | null
          other_cost?: number | null
          project_id: string
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          cost_code_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          equipment_cost?: number | null
          id?: string
          labor_cost?: number | null
          labor_hours?: number | null
          material_cost?: number | null
          other_cost?: number | null
          project_id?: string
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_costs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      osha_compliance_deadlines: {
        Row: {
          company_id: string
          completed_by: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          deadline_type: string
          description: string | null
          due_date: string
          id: string
          notes: string | null
          notification_days: number | null
          priority: string | null
          recurrence_interval: string | null
          recurring: boolean | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_by?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deadline_type: string
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          notification_days?: number | null
          priority?: string | null
          recurrence_interval?: string | null
          recurring?: boolean | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_by?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deadline_type?: string
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          notification_days?: number | null
          priority?: string | null
          recurrence_interval?: string | null
          recurring?: boolean | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "osha_compliance_deadlines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osha_compliance_deadlines_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osha_compliance_deadlines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_impact_assessments: {
        Row: {
          approved_by: string | null
          assessment_name: string
          company_id: string
          conducted_by: string
          consultation_details: string | null
          consultation_required: boolean | null
          created_at: string
          description: string
          dpo_opinion: string | null
          id: string
          mitigation_measures: Json
          necessity_justification: string
          processing_activity_id: string | null
          proportionality_assessment: string
          residual_risks: Json | null
          review_date: string | null
          reviewed_by: string | null
          risks_identified: Json
          status: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          assessment_name: string
          company_id: string
          conducted_by: string
          consultation_details?: string | null
          consultation_required?: boolean | null
          created_at?: string
          description: string
          dpo_opinion?: string | null
          id?: string
          mitigation_measures: Json
          necessity_justification: string
          processing_activity_id?: string | null
          proportionality_assessment: string
          residual_risks?: Json | null
          review_date?: string | null
          reviewed_by?: string | null
          risks_identified: Json
          status?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          assessment_name?: string
          company_id?: string
          conducted_by?: string
          consultation_details?: string | null
          consultation_required?: boolean | null
          created_at?: string
          description?: string
          dpo_opinion?: string | null
          id?: string
          mitigation_measures?: Json
          necessity_justification?: string
          processing_activity_id?: string | null
          proportionality_assessment?: string
          residual_risks?: Json | null
          review_date?: string | null
          reviewed_by?: string | null
          risks_identified?: Json
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_impact_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_impact_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_impact_assessments_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_impact_assessments_processing_activity_id_fkey"
            columns: ["processing_activity_id"]
            isOneToOne: false
            referencedRelation: "processing_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_impact_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_activities: {
        Row: {
          activity_name: string
          company_id: string
          controller_details: Json
          created_at: string
          created_by: string
          data_subjects_categories: string[]
          dpia_reference: string | null
          dpia_required: boolean | null
          id: string
          is_active: boolean | null
          last_reviewed: string | null
          lawful_basis: string[]
          personal_data_categories: string[]
          processor_details: Json | null
          purposes: string[]
          recipients: Json | null
          retention_schedule: string
          risk_assessment: Json | null
          security_measures: Json
          special_categories: string[] | null
          third_country_transfers: Json | null
          updated_at: string
        }
        Insert: {
          activity_name: string
          company_id: string
          controller_details: Json
          created_at?: string
          created_by: string
          data_subjects_categories: string[]
          dpia_reference?: string | null
          dpia_required?: boolean | null
          id?: string
          is_active?: boolean | null
          last_reviewed?: string | null
          lawful_basis: string[]
          personal_data_categories: string[]
          processor_details?: Json | null
          purposes: string[]
          recipients?: Json | null
          retention_schedule: string
          risk_assessment?: Json | null
          security_measures: Json
          special_categories?: string[] | null
          third_country_transfers?: Json | null
          updated_at?: string
        }
        Update: {
          activity_name?: string
          company_id?: string
          controller_details?: Json
          created_at?: string
          created_by?: string
          data_subjects_categories?: string[]
          dpia_reference?: string | null
          dpia_required?: boolean | null
          id?: string
          is_active?: boolean | null
          last_reviewed?: string | null
          lawful_basis?: string[]
          personal_data_categories?: string[]
          processor_details?: Json | null
          purposes?: string[]
          recipients?: Json | null
          retention_schedule?: string
          risk_assessment?: Json | null
          security_measures?: Json
          special_categories?: string[] | null
          third_country_transfers?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          actual_cost: number | null
          created_at: string
          description: string | null
          end_date: string | null
          estimated_budget: number | null
          id: string
          name: string
          order_index: number | null
          project_id: string
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_budget?: number | null
          id?: string
          name: string
          order_index?: number | null
          project_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_budget?: number | null
          id?: string
          name?: string
          order_index?: number | null
          project_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_hours: number | null
          budget: number | null
          client_email: string | null
          client_name: string | null
          company_id: string
          completion_percentage: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          name: string
          permit_numbers: string[] | null
          profit_margin: number | null
          project_manager_id: string | null
          project_type: string | null
          site_address: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          budget?: number | null
          client_email?: string | null
          client_name?: string | null
          company_id: string
          completion_percentage?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          permit_numbers?: string[] | null
          profit_margin?: number | null
          project_manager_id?: string | null
          project_type?: string | null
          site_address?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          budget?: number | null
          client_email?: string | null
          client_name?: string | null
          company_id?: string
          completion_percentage?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          permit_numbers?: string[] | null
          profit_margin?: number | null
          project_manager_id?: string | null
          project_type?: string | null
          site_address?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_rules: {
        Row: {
          block_duration_seconds: number | null
          created_at: string
          endpoint_pattern: string
          id: string
          is_active: boolean | null
          max_requests: number
          method: string | null
          priority: number | null
          rule_name: string
          rule_type: string | null
          time_window_seconds: number
          updated_at: string
        }
        Insert: {
          block_duration_seconds?: number | null
          created_at?: string
          endpoint_pattern: string
          id?: string
          is_active?: boolean | null
          max_requests: number
          method?: string | null
          priority?: number | null
          rule_name: string
          rule_type?: string | null
          time_window_seconds: number
          updated_at?: string
        }
        Update: {
          block_duration_seconds?: number | null
          created_at?: string
          endpoint_pattern?: string
          id?: string
          is_active?: boolean | null
          max_requests?: number
          method?: string | null
          priority?: number | null
          rule_name?: string
          rule_type?: string | null
          time_window_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_state: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          identifier: string
          identifier_type: string
          is_blocked: boolean | null
          last_request: string
          method: string
          request_count: number | null
          updated_at: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          identifier_type: string
          is_blocked?: boolean | null
          last_request?: string
          method: string
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          identifier_type?: string
          is_blocked?: boolean | null
          last_request?: string
          method?: string
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_violations: {
        Row: {
          action_taken: string
          block_duration_seconds: number | null
          created_at: string
          endpoint: string
          id: string
          identifier: string
          identifier_type: string
          ip_address: unknown | null
          limit_exceeded_by: number
          method: string
          referrer: string | null
          requests_made: number
          rule_id: string | null
          time_window_seconds: number
          user_agent: string | null
        }
        Insert: {
          action_taken: string
          block_duration_seconds?: number | null
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          identifier_type: string
          ip_address?: unknown | null
          limit_exceeded_by: number
          method: string
          referrer?: string | null
          requests_made: number
          rule_id?: string | null
          time_window_seconds: number
          user_agent?: string | null
        }
        Update: {
          action_taken?: string
          block_duration_seconds?: number | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          identifier_type?: string
          ip_address?: unknown | null
          limit_exceeded_by?: number
          method?: string
          referrer?: string | null
          requests_made?: number
          rule_id?: string | null
          time_window_seconds?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_notifications: {
        Row: {
          created_at: string
          id: string
          notification_type: string
          sent_at: string
          subscriber_id: string | null
          subscription_end_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_type: string
          sent_at?: string
          subscriber_id?: string | null
          subscription_end_date: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_type?: string
          sent_at?: string
          subscriber_id?: string | null
          subscription_end_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_notifications_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_checklist_responses: {
        Row: {
          checklist_id: string
          company_id: string
          completed_by: string
          corrective_actions: string | null
          created_at: string
          id: string
          issues_identified: string | null
          notes: string | null
          photos: string[] | null
          project_id: string | null
          response_date: string
          responses: Json
          status: string | null
          updated_at: string
        }
        Insert: {
          checklist_id: string
          company_id: string
          completed_by: string
          corrective_actions?: string | null
          created_at?: string
          id?: string
          issues_identified?: string | null
          notes?: string | null
          photos?: string[] | null
          project_id?: string | null
          response_date?: string
          responses: Json
          status?: string | null
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          company_id?: string
          completed_by?: string
          corrective_actions?: string | null
          created_at?: string
          id?: string
          issues_identified?: string | null
          notes?: string | null
          photos?: string[] | null
          project_id?: string | null
          response_date?: string
          responses?: Json
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_checklist_responses_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "safety_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checklist_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checklist_responses_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checklist_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_checklists: {
        Row: {
          checklist_items: Json
          checklist_type: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          industry_type: string | null
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          checklist_items: Json
          checklist_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          checklist_items?: Json
          checklist_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incidents: {
        Row: {
          body_part_affected: string | null
          company_id: string
          corrective_actions: string | null
          created_at: string
          created_by: string | null
          days_away_from_work: number | null
          description: string
          id: string
          immediate_actions: string | null
          incident_date: string
          incident_time: string | null
          incident_type: string
          injured_person_job_title: string | null
          injured_person_name: string | null
          location: string | null
          lost_time: boolean | null
          medical_attention_required: boolean | null
          osha_recordable: boolean | null
          photos: string[] | null
          project_id: string | null
          reported_by: string | null
          root_cause_analysis: string | null
          severity: string
          status: string | null
          updated_at: string
          witnesses: string[] | null
        }
        Insert: {
          body_part_affected?: string | null
          company_id: string
          corrective_actions?: string | null
          created_at?: string
          created_by?: string | null
          days_away_from_work?: number | null
          description: string
          id?: string
          immediate_actions?: string | null
          incident_date: string
          incident_time?: string | null
          incident_type: string
          injured_person_job_title?: string | null
          injured_person_name?: string | null
          location?: string | null
          lost_time?: boolean | null
          medical_attention_required?: boolean | null
          osha_recordable?: boolean | null
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          root_cause_analysis?: string | null
          severity: string
          status?: string | null
          updated_at?: string
          witnesses?: string[] | null
        }
        Update: {
          body_part_affected?: string | null
          company_id?: string
          corrective_actions?: string | null
          created_at?: string
          created_by?: string | null
          days_away_from_work?: number | null
          description?: string
          id?: string
          immediate_actions?: string | null
          incident_date?: string
          incident_time?: string | null
          incident_type?: string
          injured_person_job_title?: string | null
          injured_person_name?: string | null
          location?: string | null
          lost_time?: boolean | null
          medical_attention_required?: boolean | null
          osha_recordable?: boolean | null
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          root_cause_analysis?: string | null
          severity?: string
          status?: string | null
          updated_at?: string
          witnesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seo_analytics: {
        Row: {
          average_position: number | null
          clicks: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          search_engine: string
          top_pages: Json | null
          top_queries: Json | null
        }
        Insert: {
          average_position?: number | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          search_engine: string
          top_pages?: Json | null
          top_queries?: Json | null
        }
        Update: {
          average_position?: number | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          search_engine?: string
          top_pages?: Json | null
          top_queries?: Json | null
        }
        Relationships: []
      }
      seo_configurations: {
        Row: {
          bing_webmaster_id: string | null
          canonical_domain: string | null
          created_at: string
          default_og_image: string | null
          facebook_pixel_id: string | null
          google_ads_id: string | null
          google_analytics_id: string | null
          google_search_console_id: string | null
          id: string
          robots_txt: string | null
          schema_org_enabled: boolean | null
          site_description: string | null
          site_keywords: string[] | null
          site_name: string
          sitemap_enabled: boolean | null
          twitter_site: string | null
          updated_at: string
          yandex_webmaster_id: string | null
        }
        Insert: {
          bing_webmaster_id?: string | null
          canonical_domain?: string | null
          created_at?: string
          default_og_image?: string | null
          facebook_pixel_id?: string | null
          google_ads_id?: string | null
          google_analytics_id?: string | null
          google_search_console_id?: string | null
          id?: string
          robots_txt?: string | null
          schema_org_enabled?: boolean | null
          site_description?: string | null
          site_keywords?: string[] | null
          site_name: string
          sitemap_enabled?: boolean | null
          twitter_site?: string | null
          updated_at?: string
          yandex_webmaster_id?: string | null
        }
        Update: {
          bing_webmaster_id?: string | null
          canonical_domain?: string | null
          created_at?: string
          default_og_image?: string | null
          facebook_pixel_id?: string | null
          google_ads_id?: string | null
          google_analytics_id?: string | null
          google_search_console_id?: string | null
          id?: string
          robots_txt?: string | null
          schema_org_enabled?: boolean | null
          site_description?: string | null
          site_keywords?: string[] | null
          site_name?: string
          sitemap_enabled?: boolean | null
          twitter_site?: string | null
          updated_at?: string
          yandex_webmaster_id?: string | null
        }
        Relationships: []
      }
      seo_meta_tags: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          no_follow: boolean | null
          no_index: boolean | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          og_type: string | null
          page_path: string
          schema_markup: Json | null
          title: string | null
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          no_follow?: boolean | null
          no_index?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          page_path: string
          schema_markup?: Json | null
          title?: string | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          no_follow?: boolean | null
          no_index?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          page_path?: string
          schema_markup?: Json | null
          title?: string | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_submissions: {
        Row: {
          created_at: string
          id: string
          last_checked: string | null
          response_data: Json | null
          search_engine: string
          status: string
          submission_type: string
          submitted_at: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked?: string | null
          response_data?: Json | null
          search_engine: string
          status?: string
          submission_type: string
          submitted_at?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_checked?: string | null
          response_data?: Json | null
          search_engine?: string
          status?: string
          submission_type?: string
          submitted_at?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          billing_period: string | null
          created_at: string
          email: string
          id: string
          renewal_notification_sent_at: string | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_period?: string | null
          created_at?: string
          email: string
          id?: string
          renewal_notification_sent_at?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_period?: string | null
          created_at?: string
          email?: string
          id?: string
          renewal_notification_sent_at?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_config_changes: {
        Row: {
          approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          change_reason: string | null
          change_type: string
          component: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_value: string | null
          old_value: string | null
          rollback_data: Json | null
          rollback_possible: boolean | null
          setting_name: string
          user_id: string
        }
        Insert: {
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          change_reason?: string | null
          change_type: string
          component: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_value?: string | null
          old_value?: string | null
          rollback_data?: Json | null
          rollback_possible?: boolean | null
          setting_name: string
          user_id: string
        }
        Update: {
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          change_reason?: string | null
          change_type?: string
          component?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_value?: string | null
          old_value?: string | null
          rollback_data?: Json | null
          rollback_possible?: boolean | null
          setting_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_config_changes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_config_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          completion_percentage: number | null
          created_at: string
          created_by: string | null
          dependencies: string[] | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          name: string
          phase_id: string | null
          priority: string | null
          project_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          completion_percentage?: number | null
          created_at?: string
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          phase_id?: string | null
          priority?: string | null
          project_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          completion_percentage?: number | null
          created_at?: string
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          phase_id?: string | null
          priority?: string | null
          project_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_duration: number | null
          cost_code_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          project_id: string
          start_time: string
          task_id: string | null
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_duration?: number | null
          cost_code_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          project_id: string
          start_time: string
          task_id?: string | null
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_duration?: number | null
          cost_code_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          project_id?: string
          start_time?: string
          task_id?: string | null
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_certifications: {
        Row: {
          certification_name: string
          certification_number: string | null
          certification_type: string
          company_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          notes: string | null
          renewal_required: boolean | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certification_name: string
          certification_number?: string | null
          certification_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          renewal_required?: boolean | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certification_name?: string
          certification_number?: string | null
          certification_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          renewal_required?: boolean | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_security: {
        Row: {
          account_locked_until: string | null
          backup_codes: string[] | null
          created_at: string
          failed_login_attempts: number | null
          id: string
          last_failed_attempt: string | null
          last_login_ip: unknown | null
          last_login_user_agent: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_locked_until?: string | null
          backup_codes?: string[] | null
          created_at?: string
          failed_login_attempts?: number | null
          id?: string
          last_failed_attempt?: string | null
          last_login_ip?: unknown | null
          last_login_user_agent?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_locked_until?: string | null
          backup_codes?: string[] | null
          created_at?: string
          failed_login_attempts?: number | null
          id?: string
          last_failed_attempt?: string | null
          last_login_ip?: unknown | null
          last_login_user_agent?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_identifier_type: string
          p_endpoint: string
          p_method: string
          p_ip_address?: unknown
        }
        Returns: Json
      }
      check_type_exists: {
        Args: { type_name: string }
        Returns: boolean
      }
      get_smtp_config: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_company: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      handle_failed_login: {
        Args: {
          p_user_id: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: boolean
      }
      is_account_locked: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_company_id: string
          p_user_id: string
          p_action_type: string
          p_resource_type: string
          p_resource_id?: string
          p_resource_name?: string
          p_old_values?: Json
          p_new_values?: Json
          p_ip_address?: unknown
          p_user_agent?: string
          p_session_id?: string
          p_risk_level?: string
          p_compliance_category?: string
          p_description?: string
          p_metadata?: Json
        }
        Returns: string
      }
      log_data_access: {
        Args: {
          p_company_id: string
          p_user_id: string
          p_data_type: string
          p_data_classification: string
          p_resource_id: string
          p_resource_name?: string
          p_access_method?: string
          p_access_purpose?: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_session_id?: string
          p_lawful_basis?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_user_id: string
          p_event_type: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_details?: Json
        }
        Returns: string
      }
      reset_failed_attempts: {
        Args: {
          p_user_id: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      industry_type:
        | "residential"
        | "commercial"
        | "civil_infrastructure"
        | "specialty_trades"
      subscription_tier: "starter" | "professional" | "enterprise"
      user_role:
        | "root_admin"
        | "admin"
        | "project_manager"
        | "field_supervisor"
        | "office_staff"
        | "accounting"
        | "client_portal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      industry_type: [
        "residential",
        "commercial",
        "civil_infrastructure",
        "specialty_trades",
      ],
      subscription_tier: ["starter", "professional", "enterprise"],
      user_role: [
        "root_admin",
        "admin",
        "project_manager",
        "field_supervisor",
        "office_staff",
        "accounting",
        "client_portal",
      ],
    },
  },
} as const
