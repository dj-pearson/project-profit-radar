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
      equipment: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          current_value: number | null
          description: string | null
          equipment_type: string
          id: string
          is_active: boolean | null
          last_maintenance_date: string | null
          location: string | null
          maintenance_schedule: string | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          equipment_type: string
          id?: string
          is_active?: boolean | null
          last_maintenance_date?: string | null
          location?: string | null
          maintenance_schedule?: string | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          equipment_type?: string
          id?: string
          is_active?: boolean | null
          last_maintenance_date?: string | null
          location?: string | null
          maintenance_schedule?: string | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_usage: {
        Row: {
          created_at: string
          end_date: string | null
          equipment_id: string
          hourly_rate: number | null
          hours_used: number | null
          id: string
          notes: string | null
          operator_id: string | null
          project_id: string
          start_date: string
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          equipment_id: string
          hourly_rate?: number | null
          hours_used?: number | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          project_id: string
          start_date: string
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          equipment_id?: string
          hourly_rate?: number | null
          hours_used?: number | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          project_id?: string
          start_date?: string
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_usage_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_usage_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          cost_code_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          project_phase_id: string | null
          quantity: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          project_phase_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_price: number
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          project_phase_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_project_phase_id_fkey"
            columns: ["project_phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          client_email: string | null
          client_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          discount_amount: number | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          project_id: string | null
          sent_at: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          terms: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          client_email?: string | null
          client_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          sent_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          client_email?: string | null
          client_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          sent_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      material_usage: {
        Row: {
          created_at: string
          date_used: string
          id: string
          material_id: string
          notes: string | null
          project_id: string
          quantity_used: number
          total_cost: number
          unit_cost: number
          used_by: string | null
        }
        Insert: {
          created_at?: string
          date_used?: string
          id?: string
          material_id: string
          notes?: string | null
          project_id: string
          quantity_used: number
          total_cost: number
          unit_cost: number
          used_by?: string | null
        }
        Update: {
          created_at?: string
          date_used?: string
          id?: string
          material_id?: string
          notes?: string | null
          project_id?: string
          quantity_used?: number
          total_cost?: number
          unit_cost?: number
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_usage_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_usage_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_ordered_date: string | null
          location: string | null
          material_code: string | null
          minimum_stock_level: number | null
          name: string
          project_id: string | null
          quantity_available: number | null
          supplier_contact: string | null
          supplier_name: string | null
          unit: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_ordered_date?: string | null
          location?: string | null
          material_code?: string | null
          minimum_stock_level?: number | null
          name: string
          project_id?: string | null
          quantity_available?: number | null
          supplier_contact?: string | null
          supplier_name?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_ordered_date?: string | null
          location?: string | null
          material_code?: string | null
          minimum_stock_level?: number | null
          name?: string
          project_id?: string | null
          quantity_available?: number | null
          supplier_contact?: string | null
          supplier_name?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
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
      payment_failures: {
        Row: {
          attempt_count: number | null
          created_at: string
          dunning_status: string | null
          failure_reason: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          resolved_at: string | null
          stripe_invoice_id: string
          subscriber_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          dunning_status?: string | null
          failure_reason?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          resolved_at?: string | null
          stripe_invoice_id: string
          subscriber_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          dunning_status?: string | null
          failure_reason?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          resolved_at?: string | null
          stripe_invoice_id?: string
          subscriber_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_failures_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
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
