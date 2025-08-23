export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_control_matrix: {
        Row: {
          approval_required: boolean | null
          approval_workflow: Json | null
          classification: Database["public"]["Enums"]["data_classification"]
          company_id: string
          conditions: Json | null
          created_at: string
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          permission_level: string
          resource_id: string | null
          resource_type: string
          role: string
          updated_at: string
        }
        Insert: {
          approval_required?: boolean | null
          approval_workflow?: Json | null
          classification: Database["public"]["Enums"]["data_classification"]
          company_id: string
          conditions?: Json | null
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_level: string
          resource_id?: string | null
          resource_type: string
          role: string
          updated_at?: string
        }
        Update: {
          approval_required?: boolean | null
          approval_workflow?: Json | null
          classification?: Database["public"]["Enums"]["data_classification"]
          company_id?: string
          conditions?: Json | null
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_level?: string
          resource_id?: string | null
          resource_type?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_feed: {
        Row: {
          activity_type: string
          company_id: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          company_id: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_codes: {
        Row: {
          affiliate_code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          program_id: string
          successful_referrals: number
          total_referrals: number
          total_rewards_earned: number
          updated_at: string
        }
        Insert: {
          affiliate_code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          program_id: string
          successful_referrals?: number
          total_referrals?: number
          total_rewards_earned?: number
          updated_at?: string
        }
        Update: {
          affiliate_code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          program_id?: string
          successful_referrals?: number
          total_referrals?: number
          total_rewards_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_codes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_programs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          min_subscription_duration_months: number
          name: string
          referee_reward_months: number
          referrer_reward_months: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          min_subscription_duration_months?: number
          name?: string
          referee_reward_months?: number
          referrer_reward_months?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          min_subscription_duration_months?: number
          name?: string
          referee_reward_months?: number
          referrer_reward_months?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          affiliate_code_id: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          referee_company_id: string | null
          referee_email: string
          referee_reward_months: number | null
          referee_rewarded_at: string | null
          referral_status: string
          referrer_company_id: string
          referrer_reward_months: number | null
          referrer_rewarded_at: string | null
          subscription_duration_months: number | null
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          affiliate_code_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          referee_company_id?: string | null
          referee_email: string
          referee_reward_months?: number | null
          referee_rewarded_at?: string | null
          referral_status?: string
          referrer_company_id: string
          referrer_reward_months?: number | null
          referrer_rewarded_at?: string | null
          subscription_duration_months?: number | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_code_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          referee_company_id?: string | null
          referee_email?: string
          referee_reward_months?: number | null
          referee_rewarded_at?: string | null
          referral_status?: string
          referrer_company_id?: string
          referrer_reward_months?: number | null
          referrer_rewarded_at?: string | null
          subscription_duration_months?: number | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_code_id_fkey"
            columns: ["affiliate_code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referee_company_id_fkey"
            columns: ["referee_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referrer_company_id_fkey"
            columns: ["referrer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_rewards: {
        Row: {
          applied_at: string | null
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          referral_id: string
          reward_months: number
          reward_status: string
          reward_type: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          referral_id: string
          reward_months: number
          reward_status?: string
          reward_type: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          referral_id?: string
          reward_months?: number
          reward_status?: string
          reward_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_rewards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_coordination: {
        Row: {
          agency_name: string
          agency_position: string | null
          agency_type: string | null
          assigned_to: string | null
          company_id: string
          conditions_or_requirements: Json | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          coordination_type: string
          correspondence_log: Json | null
          created_at: string
          department_division: string | null
          description: string | null
          documents_exchanged: Json | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          initial_contact_date: string | null
          initiated_by: string | null
          last_contact_date: string | null
          meeting_notes: string | null
          next_milestone: string | null
          outcome: string | null
          permit_id: string
          response_deadline: string | null
          response_received_date: string | null
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          agency_name: string
          agency_position?: string | null
          agency_type?: string | null
          assigned_to?: string | null
          company_id: string
          conditions_or_requirements?: Json | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coordination_type: string
          correspondence_log?: Json | null
          created_at?: string
          department_division?: string | null
          description?: string | null
          documents_exchanged?: Json | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          initial_contact_date?: string | null
          initiated_by?: string | null
          last_contact_date?: string | null
          meeting_notes?: string | null
          next_milestone?: string | null
          outcome?: string | null
          permit_id: string
          response_deadline?: string | null
          response_received_date?: string | null
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          agency_name?: string
          agency_position?: string | null
          agency_type?: string | null
          assigned_to?: string | null
          company_id?: string
          conditions_or_requirements?: Json | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coordination_type?: string
          correspondence_log?: Json | null
          created_at?: string
          department_division?: string | null
          description?: string | null
          documents_exchanged?: Json | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          initial_contact_date?: string | null
          initiated_by?: string | null
          last_contact_date?: string | null
          meeting_notes?: string | null
          next_milestone?: string | null
          outcome?: string | null
          permit_id?: string
          response_deadline?: string | null
          response_received_date?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_coordination_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_coordination_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_coordination_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_coordination_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "environmental_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_lead_scores: {
        Row: {
          behavioral_score: number | null
          calculated_at: string | null
          churn_risk: number | null
          company_id: string
          confidence_level: number | null
          conversion_probability: number | null
          created_at: string | null
          demographic_score: number | null
          engagement_score: number | null
          estimated_close_time_days: number | null
          estimated_deal_size: number | null
          expires_at: string | null
          feature_importance: Json | null
          fit_score: number | null
          id: string
          intent_score: number | null
          key_insights: Json | null
          lead_id: string
          model_id: string | null
          model_version: string | null
          next_best_actions: Json | null
          opportunities: Json | null
          overall_score: number
          risk_factors: Json | null
          score_explanation: string | null
          timing_score: number | null
        }
        Insert: {
          behavioral_score?: number | null
          calculated_at?: string | null
          churn_risk?: number | null
          company_id: string
          confidence_level?: number | null
          conversion_probability?: number | null
          created_at?: string | null
          demographic_score?: number | null
          engagement_score?: number | null
          estimated_close_time_days?: number | null
          estimated_deal_size?: number | null
          expires_at?: string | null
          feature_importance?: Json | null
          fit_score?: number | null
          id?: string
          intent_score?: number | null
          key_insights?: Json | null
          lead_id: string
          model_id?: string | null
          model_version?: string | null
          next_best_actions?: Json | null
          opportunities?: Json | null
          overall_score: number
          risk_factors?: Json | null
          score_explanation?: string | null
          timing_score?: number | null
        }
        Update: {
          behavioral_score?: number | null
          calculated_at?: string | null
          churn_risk?: number | null
          company_id?: string
          confidence_level?: number | null
          conversion_probability?: number | null
          created_at?: string | null
          demographic_score?: number | null
          engagement_score?: number | null
          estimated_close_time_days?: number | null
          estimated_deal_size?: number | null
          expires_at?: string | null
          feature_importance?: Json | null
          fit_score?: number | null
          id?: string
          intent_score?: number | null
          key_insights?: Json | null
          lead_id?: string
          model_id?: string | null
          model_version?: string | null
          next_best_actions?: Json | null
          opportunities?: Json | null
          overall_score?: number
          risk_factors?: Json | null
          score_explanation?: string | null
          timing_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_lead_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_lead_scores_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "predictive_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_configurations: {
        Row: {
          context_window: number | null
          cost_rating: number | null
          created_at: string
          description: string | null
          good_for_long_form: boolean | null
          good_for_seo: boolean | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_tokens: number | null
          model_display_name: string
          model_family: string | null
          model_name: string
          provider: string
          quality_rating: number | null
          recommended_for_blog: boolean | null
          release_date: string | null
          requires_api_key: string | null
          speed_rating: number | null
          supports_function_calling: boolean | null
          supports_vision: boolean | null
          updated_at: string
        }
        Insert: {
          context_window?: number | null
          cost_rating?: number | null
          created_at?: string
          description?: string | null
          good_for_long_form?: boolean | null
          good_for_seo?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_tokens?: number | null
          model_display_name: string
          model_family?: string | null
          model_name: string
          provider: string
          quality_rating?: number | null
          recommended_for_blog?: boolean | null
          release_date?: string | null
          requires_api_key?: string | null
          speed_rating?: number | null
          supports_function_calling?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string
        }
        Update: {
          context_window?: number | null
          cost_rating?: number | null
          created_at?: string
          description?: string | null
          good_for_long_form?: boolean | null
          good_for_seo?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_tokens?: number | null
          model_display_name?: string
          model_family?: string | null
          model_name?: string
          provider?: string
          quality_rating?: number | null
          recommended_for_blog?: boolean | null
          release_date?: string | null
          requires_api_key?: string | null
          speed_rating?: number | null
          supports_function_calling?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
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
      alert_notifications: {
        Row: {
          alert_id: string
          created_at: string
          delivery_confirmed_at: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          notification_method: string
          recipient: string
          retry_count: number | null
          sent_at: string | null
          status: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          delivery_confirmed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          notification_method: string
          recipient: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          delivery_confirmed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          notification_method?: string
          recipient?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      analytics_dashboard_cache: {
        Row: {
          cache_data: Json
          cache_key: string
          cache_version: string | null
          company_id: string
          dashboard_type: string
          data_sources: Json | null
          expires_at: string
          generation_time_ms: number | null
          id: string
          last_updated: string
        }
        Insert: {
          cache_data: Json
          cache_key: string
          cache_version?: string | null
          company_id: string
          dashboard_type: string
          data_sources?: Json | null
          expires_at?: string
          generation_time_ms?: number | null
          id?: string
          last_updated?: string
        }
        Update: {
          cache_data?: Json
          cache_key?: string
          cache_version?: string | null
          company_id?: string
          dashboard_type?: string
          data_sources?: Json | null
          expires_at?: string
          generation_time_ms?: number | null
          id?: string
          last_updated?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key_hash: string
          api_key_prefix: string
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_name: string
          last_used_at: string | null
          permissions: Json
          rate_limit_per_hour: number
          updated_at: string
          usage_count: number
        }
        Insert: {
          api_key_hash: string
          api_key_prefix: string
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_name: string
          last_used_at?: string | null
          permissions?: Json
          rate_limit_per_hour?: number
          updated_at?: string
          usage_count?: number
        }
        Update: {
          api_key_hash?: string
          api_key_prefix?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_name?: string
          last_used_at?: string | null
          permissions?: Json
          rate_limit_per_hour?: number
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          company_id: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          method: string
          processing_time_ms: number | null
          request_body: Json | null
          request_headers: Json | null
          response_body: Json | null
          response_headers: Json | null
          response_status: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          company_id?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method: string
          processing_time_ms?: number | null
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          response_headers?: Json | null
          response_status?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          company_id?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method?: string
          processing_time_ms?: number | null
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          response_headers?: Json | null
          response_status?: number | null
          user_agent?: string | null
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
      automated_social_content_library: {
        Row: {
          active: boolean | null
          content_type: string
          created_at: string
          cta_template: string | null
          description: string
          id: string
          key_points: string[] | null
          last_used_at: string | null
          priority: number | null
          title: string
          topic: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          active?: boolean | null
          content_type: string
          created_at?: string
          cta_template?: string | null
          description: string
          id?: string
          key_points?: string[] | null
          last_used_at?: string | null
          priority?: number | null
          title: string
          topic: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          active?: boolean | null
          content_type?: string
          created_at?: string
          cta_template?: string | null
          description?: string
          id?: string
          key_points?: string[] | null
          last_used_at?: string | null
          priority?: number | null
          title?: string
          topic?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      automated_social_posts_config: {
        Row: {
          auto_schedule: boolean | null
          blog_webhook_url: string | null
          company_id: string
          content_types: string[] | null
          created_at: string
          enabled: boolean | null
          id: string
          next_post_at: string | null
          platforms: string[] | null
          post_interval_hours: number | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          auto_schedule?: boolean | null
          blog_webhook_url?: string | null
          company_id: string
          content_types?: string[] | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          next_post_at?: string | null
          platforms?: string[] | null
          post_interval_hours?: number | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          auto_schedule?: boolean | null
          blog_webhook_url?: string | null
          company_id?: string
          content_types?: string[] | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          next_post_at?: string | null
          platforms?: string[] | null
          post_interval_hours?: number | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automated_social_posts_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_social_posts_queue: {
        Row: {
          company_id: string
          content_type: string
          created_at: string
          error_message: string | null
          id: string
          platforms_processed: string[] | null
          posts_created: number | null
          processed_at: string | null
          scheduled_for: string
          status: string | null
          topic: string
          webhook_sent: boolean | null
        }
        Insert: {
          company_id: string
          content_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          platforms_processed?: string[] | null
          posts_created?: number | null
          processed_at?: string | null
          scheduled_for: string
          status?: string | null
          topic: string
          webhook_sent?: boolean | null
        }
        Update: {
          company_id?: string
          content_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          platforms_processed?: string[] | null
          posts_created?: number | null
          processed_at?: string | null
          scheduled_for?: string
          status?: string | null
          topic?: string
          webhook_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "automated_social_posts_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_analytics: {
        Row: {
          analysis_period: string
          average_bid_amount: number | null
          average_margin_percentage: number | null
          company_id: string
          created_at: string | null
          id: string
          performance_trends: Json | null
          period_end: string
          period_start: string
          roi_percentage: number | null
          top_competitors: Json | null
          top_loss_reasons: Json | null
          total_bid_costs: number | null
          total_bid_value: number | null
          total_bids_lost: number | null
          total_bids_submitted: number | null
          total_bids_won: number | null
          total_won_value: number | null
          updated_at: string | null
          win_rate_percentage: number | null
        }
        Insert: {
          analysis_period: string
          average_bid_amount?: number | null
          average_margin_percentage?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          performance_trends?: Json | null
          period_end: string
          period_start: string
          roi_percentage?: number | null
          top_competitors?: Json | null
          top_loss_reasons?: Json | null
          total_bid_costs?: number | null
          total_bid_value?: number | null
          total_bids_lost?: number | null
          total_bids_submitted?: number | null
          total_bids_won?: number | null
          total_won_value?: number | null
          updated_at?: string | null
          win_rate_percentage?: number | null
        }
        Update: {
          analysis_period?: string
          average_bid_amount?: number | null
          average_margin_percentage?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          performance_trends?: Json | null
          period_end?: string
          period_start?: string
          roi_percentage?: number | null
          top_competitors?: Json | null
          top_loss_reasons?: Json | null
          total_bid_costs?: number | null
          total_bid_value?: number | null
          total_bids_lost?: number | null
          total_bids_submitted?: number | null
          total_bids_won?: number | null
          total_won_value?: number | null
          updated_at?: string | null
          win_rate_percentage?: number | null
        }
        Relationships: []
      }
      bid_documents: {
        Row: {
          bid_submission_id: string | null
          created_at: string
          description: string | null
          document_name: string
          document_type: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_current_version: boolean | null
          is_required: boolean | null
          is_submitted: boolean | null
          notes: string | null
          opportunity_id: string | null
          submission_date: string | null
          supersedes_document_id: string | null
          updated_at: string
          uploaded_by: string | null
          version_number: number | null
        }
        Insert: {
          bid_submission_id?: string | null
          created_at?: string
          description?: string | null
          document_name: string
          document_type: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean | null
          is_required?: boolean | null
          is_submitted?: boolean | null
          notes?: string | null
          opportunity_id?: string | null
          submission_date?: string | null
          supersedes_document_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number | null
        }
        Update: {
          bid_submission_id?: string | null
          created_at?: string
          description?: string | null
          document_name?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean | null
          is_required?: boolean | null
          is_submitted?: boolean | null
          notes?: string | null
          opportunity_id?: string | null
          submission_date?: string | null
          supersedes_document_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_documents_bid_submission_id_fkey"
            columns: ["bid_submission_id"]
            isOneToOne: false
            referencedRelation: "bid_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "procurement_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_performance_benchmarks: {
        Row: {
          benchmark_type: string
          benchmark_value: number
          company_size_category: string
          confidence_level: number | null
          created_at: string | null
          data_source: string | null
          id: string
          industry_sector: string
          is_active: boolean | null
          last_updated: string | null
          region: string | null
          sample_size: number | null
          updated_at: string | null
        }
        Insert: {
          benchmark_type: string
          benchmark_value: number
          company_size_category: string
          confidence_level?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          industry_sector: string
          is_active?: boolean | null
          last_updated?: string | null
          region?: string | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Update: {
          benchmark_type?: string
          benchmark_value?: number
          company_size_category?: string
          confidence_level?: number | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          industry_sector?: string
          is_active?: boolean | null
          last_updated?: string | null
          region?: string | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bid_submissions: {
        Row: {
          addenda_acknowledged: string[] | null
          allowances: Json | null
          alternate_amounts: Json | null
          award_amount: number | null
          award_notification_date: string | null
          base_bid_amount: number | null
          bid_amount: number
          bid_bond_amount: number | null
          bid_cost: number | null
          bid_documents_path: string | null
          bid_number: string | null
          bid_preparation_hours: number | null
          client_feedback: string | null
          company_id: string
          competitor_bid_amount: number | null
          competitor_winner: string | null
          confirmation_number: string | null
          cost_proposal_path: string | null
          created_at: string
          created_by: string | null
          debriefing_date: string | null
          debriefing_requested: boolean | null
          equipment_list: Json | null
          exceptions_taken: string | null
          follow_up_opportunities: string | null
          id: string
          key_personnel: Json | null
          lessons_learned: string | null
          lessons_learned_summary: string | null
          loss_reason: string | null
          margin_percentage: number | null
          notes: string | null
          opportunity_id: string
          payment_bond_percentage: number | null
          performance_bond_percentage: number | null
          probability_score: number | null
          project_duration_days: number | null
          project_manager_name: string | null
          proposed_completion_date: string | null
          proposed_start_date: string | null
          protest_filed: boolean | null
          protest_outcome: string | null
          ranking: number | null
          roi_if_won: number | null
          status: string
          submission_method: string | null
          submitted_at: string | null
          substitutions_requested: Json | null
          technical_proposal_path: string | null
          unit_prices: Json | null
          updated_at: string
          win_loss_status: string | null
        }
        Insert: {
          addenda_acknowledged?: string[] | null
          allowances?: Json | null
          alternate_amounts?: Json | null
          award_amount?: number | null
          award_notification_date?: string | null
          base_bid_amount?: number | null
          bid_amount: number
          bid_bond_amount?: number | null
          bid_cost?: number | null
          bid_documents_path?: string | null
          bid_number?: string | null
          bid_preparation_hours?: number | null
          client_feedback?: string | null
          company_id: string
          competitor_bid_amount?: number | null
          competitor_winner?: string | null
          confirmation_number?: string | null
          cost_proposal_path?: string | null
          created_at?: string
          created_by?: string | null
          debriefing_date?: string | null
          debriefing_requested?: boolean | null
          equipment_list?: Json | null
          exceptions_taken?: string | null
          follow_up_opportunities?: string | null
          id?: string
          key_personnel?: Json | null
          lessons_learned?: string | null
          lessons_learned_summary?: string | null
          loss_reason?: string | null
          margin_percentage?: number | null
          notes?: string | null
          opportunity_id: string
          payment_bond_percentage?: number | null
          performance_bond_percentage?: number | null
          probability_score?: number | null
          project_duration_days?: number | null
          project_manager_name?: string | null
          proposed_completion_date?: string | null
          proposed_start_date?: string | null
          protest_filed?: boolean | null
          protest_outcome?: string | null
          ranking?: number | null
          roi_if_won?: number | null
          status?: string
          submission_method?: string | null
          submitted_at?: string | null
          substitutions_requested?: Json | null
          technical_proposal_path?: string | null
          unit_prices?: Json | null
          updated_at?: string
          win_loss_status?: string | null
        }
        Update: {
          addenda_acknowledged?: string[] | null
          allowances?: Json | null
          alternate_amounts?: Json | null
          award_amount?: number | null
          award_notification_date?: string | null
          base_bid_amount?: number | null
          bid_amount?: number
          bid_bond_amount?: number | null
          bid_cost?: number | null
          bid_documents_path?: string | null
          bid_number?: string | null
          bid_preparation_hours?: number | null
          client_feedback?: string | null
          company_id?: string
          competitor_bid_amount?: number | null
          competitor_winner?: string | null
          confirmation_number?: string | null
          cost_proposal_path?: string | null
          created_at?: string
          created_by?: string | null
          debriefing_date?: string | null
          debriefing_requested?: boolean | null
          equipment_list?: Json | null
          exceptions_taken?: string | null
          follow_up_opportunities?: string | null
          id?: string
          key_personnel?: Json | null
          lessons_learned?: string | null
          lessons_learned_summary?: string | null
          loss_reason?: string | null
          margin_percentage?: number | null
          notes?: string | null
          opportunity_id?: string
          payment_bond_percentage?: number | null
          performance_bond_percentage?: number | null
          probability_score?: number | null
          project_duration_days?: number | null
          project_manager_name?: string | null
          proposed_completion_date?: string | null
          proposed_start_date?: string | null
          protest_filed?: boolean | null
          protest_outcome?: string | null
          ranking?: number | null
          roi_if_won?: number | null
          status?: string
          submission_method?: string | null
          submitted_at?: string | null
          substitutions_requested?: Json | null
          technical_proposal_path?: string | null
          unit_prices?: Json | null
          updated_at?: string
          win_loss_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_submissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_submissions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "procurement_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_auto_generation_settings: {
        Row: {
          ai_search_optimization: boolean | null
          auto_publish: boolean | null
          brand_voice_guidelines: string | null
          company_id: string
          content_analysis_depth: string | null
          content_style: string | null
          content_template: string | null
          created_at: string
          created_by: string | null
          custom_instructions: string | null
          fallback_model: string | null
          generation_frequency: string
          generation_time: string
          generation_timezone: string
          geo_optimization: boolean | null
          id: string
          industry_focus: string[] | null
          is_enabled: boolean
          last_generation_at: string | null
          minimum_topic_gap_days: number | null
          model_temperature: number | null
          next_generation_at: string | null
          notification_emails: string[] | null
          notify_on_generation: boolean | null
          optimize_for_geographic: boolean | null
          perplexity_optimization: boolean | null
          preferred_ai_provider: string
          preferred_model: string
          publish_as_draft: boolean | null
          require_review: boolean | null
          seo_focus: string | null
          target_keywords: string[] | null
          target_locations: string[] | null
          target_word_count: number | null
          topic_diversity_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          ai_search_optimization?: boolean | null
          auto_publish?: boolean | null
          brand_voice_guidelines?: string | null
          company_id: string
          content_analysis_depth?: string | null
          content_style?: string | null
          content_template?: string | null
          created_at?: string
          created_by?: string | null
          custom_instructions?: string | null
          fallback_model?: string | null
          generation_frequency?: string
          generation_time?: string
          generation_timezone?: string
          geo_optimization?: boolean | null
          id?: string
          industry_focus?: string[] | null
          is_enabled?: boolean
          last_generation_at?: string | null
          minimum_topic_gap_days?: number | null
          model_temperature?: number | null
          next_generation_at?: string | null
          notification_emails?: string[] | null
          notify_on_generation?: boolean | null
          optimize_for_geographic?: boolean | null
          perplexity_optimization?: boolean | null
          preferred_ai_provider?: string
          preferred_model?: string
          publish_as_draft?: boolean | null
          require_review?: boolean | null
          seo_focus?: string | null
          target_keywords?: string[] | null
          target_locations?: string[] | null
          target_word_count?: number | null
          topic_diversity_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          ai_search_optimization?: boolean | null
          auto_publish?: boolean | null
          brand_voice_guidelines?: string | null
          company_id?: string
          content_analysis_depth?: string | null
          content_style?: string | null
          content_template?: string | null
          created_at?: string
          created_by?: string | null
          custom_instructions?: string | null
          fallback_model?: string | null
          generation_frequency?: string
          generation_time?: string
          generation_timezone?: string
          geo_optimization?: boolean | null
          id?: string
          industry_focus?: string[] | null
          is_enabled?: boolean
          last_generation_at?: string | null
          minimum_topic_gap_days?: number | null
          model_temperature?: number | null
          next_generation_at?: string | null
          notification_emails?: string[] | null
          notify_on_generation?: boolean | null
          optimize_for_geographic?: boolean | null
          perplexity_optimization?: boolean | null
          preferred_ai_provider?: string
          preferred_model?: string
          publish_as_draft?: boolean | null
          require_review?: boolean | null
          seo_focus?: string | null
          target_keywords?: string[] | null
          target_locations?: string[] | null
          target_word_count?: number | null
          topic_diversity_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_auto_generation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_content_analysis: {
        Row: {
          ai_confidence: number | null
          analyzed_at: string
          blog_post_id: string
          created_at: string
          engagement_score: number | null
          external_links_count: number | null
          extracted_topics: string[] | null
          generation_model: string | null
          generation_prompt: string | null
          generation_temperature: number | null
          heading_structure: Json | null
          id: string
          internal_links_count: number | null
          key_phrases: string[] | null
          keyword_density: Json | null
          meta_optimization_score: number | null
          named_entities: Json | null
          readability_score: number | null
          search_clicks: number | null
          search_impressions: number | null
          sentiment_score: number | null
          seo_score: number | null
          topic_coherence_score: number | null
          view_count: number | null
          word_count: number | null
        }
        Insert: {
          ai_confidence?: number | null
          analyzed_at?: string
          blog_post_id: string
          created_at?: string
          engagement_score?: number | null
          external_links_count?: number | null
          extracted_topics?: string[] | null
          generation_model?: string | null
          generation_prompt?: string | null
          generation_temperature?: number | null
          heading_structure?: Json | null
          id?: string
          internal_links_count?: number | null
          key_phrases?: string[] | null
          keyword_density?: Json | null
          meta_optimization_score?: number | null
          named_entities?: Json | null
          readability_score?: number | null
          search_clicks?: number | null
          search_impressions?: number | null
          sentiment_score?: number | null
          seo_score?: number | null
          topic_coherence_score?: number | null
          view_count?: number | null
          word_count?: number | null
        }
        Update: {
          ai_confidence?: number | null
          analyzed_at?: string
          blog_post_id?: string
          created_at?: string
          engagement_score?: number | null
          external_links_count?: number | null
          extracted_topics?: string[] | null
          generation_model?: string | null
          generation_prompt?: string | null
          generation_temperature?: number | null
          heading_structure?: Json | null
          id?: string
          internal_links_count?: number | null
          key_phrases?: string[] | null
          keyword_density?: Json | null
          meta_optimization_score?: number | null
          named_entities?: Json | null
          readability_score?: number | null
          search_clicks?: number | null
          search_impressions?: number | null
          sentiment_score?: number | null
          seo_score?: number | null
          topic_coherence_score?: number | null
          view_count?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_content_analysis_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_generation_queue: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          company_id: string
          content_parameters: Json | null
          created_at: string
          error_message: string | null
          generated_blog_id: string | null
          generation_type: string | null
          id: string
          max_retries: number | null
          priority: number | null
          processing_completed_at: string | null
          processing_started_at: string | null
          requested_by: string | null
          retry_count: number | null
          scheduled_for: string
          status: string
          suggested_topic: string | null
          target_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          company_id: string
          content_parameters?: Json | null
          created_at?: string
          error_message?: string | null
          generated_blog_id?: string | null
          generation_type?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          requested_by?: string | null
          retry_count?: number | null
          scheduled_for: string
          status?: string
          suggested_topic?: string | null
          target_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          company_id?: string
          content_parameters?: Json | null
          created_at?: string
          error_message?: string | null
          generated_blog_id?: string | null
          generation_type?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          requested_by?: string | null
          retry_count?: number | null
          scheduled_for?: string
          status?: string
          suggested_topic?: string | null
          target_keywords?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_generation_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_generation_queue_generated_blog_id_fkey"
            columns: ["generated_blog_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
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
          scheduled_at: string | null
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
          scheduled_at?: string | null
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
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_topic_history: {
        Row: {
          ai_confidence_score: number | null
          blog_post_id: string | null
          company_id: string
          content_type: string | null
          created_at: string
          generation_model: string | null
          generation_time_seconds: number | null
          geo_targets: string[] | null
          id: string
          keywords_used: string[] | null
          primary_topic: string
          readability_score: number | null
          secondary_topics: string[] | null
          seo_score: number | null
          target_keywords: string[] | null
          topic_category: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          blog_post_id?: string | null
          company_id: string
          content_type?: string | null
          created_at?: string
          generation_model?: string | null
          generation_time_seconds?: number | null
          geo_targets?: string[] | null
          id?: string
          keywords_used?: string[] | null
          primary_topic: string
          readability_score?: number | null
          secondary_topics?: string[] | null
          seo_score?: number | null
          target_keywords?: string[] | null
          topic_category?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          blog_post_id?: string | null
          company_id?: string
          content_type?: string | null
          created_at?: string
          generation_model?: string | null
          generation_time_seconds?: number | null
          geo_targets?: string[] | null
          id?: string
          keywords_used?: string[] | null
          primary_topic?: string
          readability_score?: number | null
          secondary_topics?: string[] | null
          seo_score?: number | null
          target_keywords?: string[] | null
          topic_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_topic_history_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_topic_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bonds: {
        Row: {
          agent_company: string | null
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          bond_amount: number
          bond_document_path: string | null
          bond_name: string
          bond_number: string
          bond_percentage: number | null
          bond_type: string
          certificate_path: string | null
          claim_amount: number | null
          claim_date: string | null
          claim_made: boolean | null
          claim_notes: string | null
          claim_status: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          effective_date: string
          expiry_date: string
          id: string
          issued_date: string | null
          notes: string | null
          obligee_name: string
          premium_amount: number | null
          principal_name: string
          project_id: string | null
          status: string
          surety_company: string
          surety_contact_email: string | null
          surety_contact_name: string | null
          surety_contact_phone: string | null
          updated_at: string
        }
        Insert: {
          agent_company?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          bond_amount: number
          bond_document_path?: string | null
          bond_name: string
          bond_number: string
          bond_percentage?: number | null
          bond_type: string
          certificate_path?: string | null
          claim_amount?: number | null
          claim_date?: string | null
          claim_made?: boolean | null
          claim_notes?: string | null
          claim_status?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date: string
          expiry_date: string
          id?: string
          issued_date?: string | null
          notes?: string | null
          obligee_name: string
          premium_amount?: number | null
          principal_name: string
          project_id?: string | null
          status?: string
          surety_company: string
          surety_contact_email?: string | null
          surety_contact_name?: string | null
          surety_contact_phone?: string | null
          updated_at?: string
        }
        Update: {
          agent_company?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          bond_amount?: number
          bond_document_path?: string | null
          bond_name?: string
          bond_number?: string
          bond_percentage?: number | null
          bond_type?: string
          certificate_path?: string | null
          claim_amount?: number | null
          claim_date?: string | null
          claim_made?: boolean | null
          claim_notes?: string | null
          claim_status?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string
          expiry_date?: string
          id?: string
          issued_date?: string | null
          notes?: string | null
          obligee_name?: string
          premium_amount?: number | null
          principal_name?: string
          project_id?: string | null
          status?: string
          surety_company?: string
          surety_contact_email?: string | null
          surety_contact_name?: string | null
          surety_contact_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bonds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_alerts: {
        Row: {
          acknowledged: boolean
          alert_type: string
          category: string
          created_at: string
          id: string
          message: string
          project_id: string
          threshold_exceeded: number
        }
        Insert: {
          acknowledged?: boolean
          alert_type: string
          category: string
          created_at?: string
          id?: string
          message: string
          project_id: string
          threshold_exceeded: number
        }
        Update: {
          acknowledged?: boolean
          alert_type?: string
          category?: string
          created_at?: string
          id?: string
          message?: string
          project_id?: string
          threshold_exceeded?: number
        }
        Relationships: []
      }
      budget_tracking: {
        Row: {
          actual_amount: number
          budgeted_amount: number
          category: string
          created_at: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number
          budgeted_amount?: number
          category: string
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number
          budgeted_amount?: number
          category?: string
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          calendar_provider: string
          company_id: string
          created_at: string
          description: string | null
          end_time: string
          external_id: string
          id: string
          integration_id: string
          project_id: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          calendar_provider: string
          company_id: string
          created_at?: string
          description?: string | null
          end_time: string
          external_id: string
          id?: string
          integration_id: string
          project_id?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          calendar_provider?: string
          company_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          external_id?: string
          id?: string
          integration_id?: string
          project_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string
          account_email: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          last_sync: string | null
          provider: string
          refresh_token: string | null
          sync_enabled: boolean
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          account_email: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync?: string | null
          provider: string
          refresh_token?: string | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_email?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync?: string | null
          provider?: string
          refresh_token?: string | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_projections: {
        Row: {
          actual_balance: number | null
          actual_expenses: number | null
          actual_income: number | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          projected_balance: number | null
          projected_expenses: number | null
          projected_income: number | null
          projection_date: string
          updated_at: string
        }
        Insert: {
          actual_balance?: number | null
          actual_expenses?: number | null
          actual_income?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          projected_balance?: number | null
          projected_expenses?: number | null
          projected_income?: number | null
          projection_date: string
          updated_at?: string
        }
        Update: {
          actual_balance?: number | null
          actual_expenses?: number | null
          actual_income?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          projected_balance?: number | null
          projected_expenses?: number | null
          projected_income?: number | null
          projection_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cash_flow_projections_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount: number
          approval_due_date: string | null
          approval_notes: string | null
          assigned_approvers: string[] | null
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
          approval_due_date?: string | null
          approval_notes?: string | null
          assigned_approvers?: string[] | null
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
          approval_due_date?: string | null
          approval_notes?: string | null
          assigned_approvers?: string[] | null
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chargeback_fees: {
        Row: {
          chargeback_amount: number
          charged_at: string | null
          charged_by: string | null
          company_id: string
          created_at: string
          fee_amount: number
          id: string
          payment_intent_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          chargeback_amount: number
          charged_at?: string | null
          charged_by?: string | null
          company_id: string
          created_at?: string
          fee_amount: number
          id?: string
          payment_intent_id: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          chargeback_amount?: number
          charged_at?: string | null
          charged_by?: string | null
          company_id?: string
          created_at?: string
          fee_amount?: number
          id?: string
          payment_intent_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chargeback_fees_charged_by_fkey"
            columns: ["charged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chargeback_fees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          company_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          notifications_enabled: boolean
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          company_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications_enabled?: boolean
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          company_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications_enabled?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          archived_at: string | null
          channel_type: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean
          last_activity_at: string | null
          name: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          channel_type?: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean
          last_activity_at?: string | null
          name: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          channel_type?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean
          last_activity_at?: string | null
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          company_id: string
          content: string | null
          created_at: string
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          message_type: string
          metadata: Json | null
          reply_to: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          company_id: string
          content?: string | null
          created_at?: string
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          reply_to?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          company_id?: string
          content?: string | null
          created_at?: string
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communications: {
        Row: {
          attachments: Json | null
          client_contact_id: string | null
          communication_type: string | null
          company_id: string
          created_at: string
          id: string
          message: string
          priority: string | null
          project_id: string | null
          read_at: string | null
          replied_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string
          tags: Json | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          client_contact_id?: string | null
          communication_type?: string | null
          company_id: string
          created_at?: string
          id?: string
          message: string
          priority?: string | null
          project_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject: string
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          client_contact_id?: string | null
          communication_type?: string | null
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string | null
          project_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "client_communications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_document_shares: {
        Row: {
          access_level: string | null
          company_id: string
          created_at: string
          document_id: string | null
          document_name: string
          document_type: string
          download_count: number | null
          expires_at: string | null
          file_path: string
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          project_id: string
          shared_by: string | null
          shared_with_email: string
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          company_id: string
          created_at?: string
          document_id?: string | null
          document_name: string
          document_type: string
          download_count?: number | null
          expires_at?: string | null
          file_path: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          project_id: string
          shared_by?: string | null
          shared_with_email: string
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          company_id?: string
          created_at?: string
          document_id?: string | null
          document_name?: string
          document_type?: string
          download_count?: number | null
          expires_at?: string | null
          file_path?: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          project_id?: string
          shared_by?: string | null
          shared_with_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_portal_access: {
        Row: {
          access_level: string
          access_token: string
          client_email: string
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          access_token: string
          client_email: string
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          access_token?: string
          client_email?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      collaboration_sessions: {
        Row: {
          company_id: string
          created_by: string
          description: string | null
          document_id: string | null
          ended_at: string | null
          id: string
          participants: Json | null
          project_id: string | null
          session_data: Json | null
          session_type: string
          started_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_by: string
          description?: string | null
          document_id?: string | null
          ended_at?: string | null
          id?: string
          participants?: Json | null
          project_id?: string | null
          session_data?: Json | null
          session_type: string
          started_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_by?: string
          description?: string | null
          document_id?: string | null
          ended_at?: string | null
          id?: string
          participants?: Json | null
          project_id?: string | null
          session_data?: Json | null
          session_type?: string
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_log: {
        Row: {
          attachments: Json | null
          communication_type: string
          company_id: string
          content: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          direction: string
          id: string
          is_automated: boolean | null
          lead_id: string | null
          metadata: Json | null
          participants: Json | null
          project_id: string | null
          read_at: string | null
          replied_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          communication_type: string
          company_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          direction: string
          id?: string
          is_automated?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          participants?: Json | null
          project_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          communication_type?: string
          company_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          direction?: string
          id?: string
          is_automated?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          participants?: Json | null
          project_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communication_templates: {
        Row: {
          category: string
          communication_type: string
          company_id: string
          content_template: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          subject_template: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category: string
          communication_type: string
          company_id: string
          content_template: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject_template?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string
          communication_type?: string
          company_id?: string
          content_template?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject_template?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
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
      company_admin_settings: {
        Row: {
          billing_settings: Json | null
          company_id: string
          company_logo_url: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          custom_theme: Json | null
          data_retention: Json | null
          email_signature: string | null
          id: string
          integration_config: Json | null
          primary_color: string | null
          secondary_color: string | null
          security_policies: Json | null
          updated_at: string
          updated_by: string | null
          user_invite_settings: Json | null
          workflow_settings: Json | null
        }
        Insert: {
          billing_settings?: Json | null
          company_id: string
          company_logo_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          custom_theme?: Json | null
          data_retention?: Json | null
          email_signature?: string | null
          id?: string
          integration_config?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          security_policies?: Json | null
          updated_at?: string
          updated_by?: string | null
          user_invite_settings?: Json | null
          workflow_settings?: Json | null
        }
        Update: {
          billing_settings?: Json | null
          company_id?: string
          company_logo_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          custom_theme?: Json | null
          data_retention?: Json | null
          email_signature?: string | null
          id?: string
          integration_config?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          security_policies?: Json | null
          updated_at?: string
          updated_by?: string | null
          user_invite_settings?: Json | null
          workflow_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_admin_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_custom_fields: {
        Row: {
          applies_to: string
          company_id: string
          created_at: string
          created_by: string | null
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          applies_to: string
          company_id: string
          created_at?: string
          created_by?: string | null
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_custom_fields_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payment_settings: {
        Row: {
          authorize_net_api_login: string | null
          authorize_net_transaction_key_encrypted: string | null
          chargeback_fee: number | null
          clover_app_id: string | null
          clover_app_secret_encrypted: string | null
          company_id: string
          configured_at: string | null
          configured_by: string | null
          created_at: string
          id: string
          is_active: boolean
          paypal_client_id: string | null
          paypal_client_secret_encrypted: string | null
          per_transaction_fee: number | null
          processing_fee_percentage: number | null
          processor_type: string
          square_access_token_encrypted: string | null
          square_application_id: string | null
          stripe_publishable_key: string | null
          stripe_secret_key_encrypted: string | null
          stripe_webhook_secret_encrypted: string | null
          updated_at: string
        }
        Insert: {
          authorize_net_api_login?: string | null
          authorize_net_transaction_key_encrypted?: string | null
          chargeback_fee?: number | null
          clover_app_id?: string | null
          clover_app_secret_encrypted?: string | null
          company_id: string
          configured_at?: string | null
          configured_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          paypal_client_id?: string | null
          paypal_client_secret_encrypted?: string | null
          per_transaction_fee?: number | null
          processing_fee_percentage?: number | null
          processor_type: string
          square_access_token_encrypted?: string | null
          square_application_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key_encrypted?: string | null
          stripe_webhook_secret_encrypted?: string | null
          updated_at?: string
        }
        Update: {
          authorize_net_api_login?: string | null
          authorize_net_transaction_key_encrypted?: string | null
          chargeback_fee?: number | null
          clover_app_id?: string | null
          clover_app_secret_encrypted?: string | null
          company_id?: string
          configured_at?: string | null
          configured_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          paypal_client_id?: string | null
          paypal_client_secret_encrypted?: string | null
          per_transaction_fee?: number | null
          processing_fee_percentage?: number | null
          processor_type?: string
          square_access_token_encrypted?: string | null
          square_application_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key_encrypted?: string | null
          stripe_webhook_secret_encrypted?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_payment_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          additional_settings: Json | null
          company_id: string
          company_logo: string | null
          created_at: string
          created_by: string | null
          default_markup: number
          default_project_view: string
          default_working_hours: string
          due_date_reminders: boolean
          email_notifications: boolean
          enable_crm: boolean
          enable_document_management: boolean
          enable_financial_management: boolean
          enable_mobile_access: boolean
          enable_project_management: boolean
          enable_reporting: boolean
          enable_safety_management: boolean
          enable_time_tracking: boolean
          fiscal_year_start: string
          id: string
          primary_color: string
          project_update_notifications: boolean
          safety_alerts: boolean
          time_zone: string
          updated_at: string
        }
        Insert: {
          additional_settings?: Json | null
          company_id: string
          company_logo?: string | null
          created_at?: string
          created_by?: string | null
          default_markup?: number
          default_project_view?: string
          default_working_hours?: string
          due_date_reminders?: boolean
          email_notifications?: boolean
          enable_crm?: boolean
          enable_document_management?: boolean
          enable_financial_management?: boolean
          enable_mobile_access?: boolean
          enable_project_management?: boolean
          enable_reporting?: boolean
          enable_safety_management?: boolean
          enable_time_tracking?: boolean
          fiscal_year_start?: string
          id?: string
          primary_color?: string
          project_update_notifications?: boolean
          safety_alerts?: boolean
          time_zone?: string
          updated_at?: string
        }
        Update: {
          additional_settings?: Json | null
          company_id?: string
          company_logo?: string | null
          created_at?: string
          created_by?: string | null
          default_markup?: number
          default_project_view?: string
          default_working_hours?: string
          due_date_reminders?: boolean
          email_notifications?: boolean
          enable_crm?: boolean
          enable_document_management?: boolean
          enable_financial_management?: boolean
          enable_mobile_access?: boolean
          enable_project_management?: boolean
          enable_reporting?: boolean
          enable_safety_management?: boolean
          enable_time_tracking?: boolean
          fiscal_year_start?: string
          id?: string
          primary_color?: string
          project_update_notifications?: boolean
          safety_alerts?: boolean
          time_zone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      complimentary_subscription_history: {
        Row: {
          complimentary_type: string
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          status: string
          subscriber_id: string | null
        }
        Insert: {
          complimentary_type: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Update: {
          complimentary_type?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complimentary_subscription_history_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
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
      contacts: {
        Row: {
          address: string | null
          anniversary: string | null
          assigned_to: string | null
          birthday: string | null
          city: string | null
          company_id: string
          company_name: string | null
          contact_type: string
          country: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          department: string | null
          email: string | null
          first_name: string
          id: string
          job_title: string | null
          last_contact_date: string | null
          last_name: string
          lead_source: string | null
          linkedin_profile: string | null
          mobile_phone: string | null
          next_contact_date: string | null
          notes: string | null
          phone: string | null
          preferred_contact_method: string | null
          relationship_status: string
          state: string | null
          tags: string[] | null
          time_zone: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          anniversary?: string | null
          assigned_to?: string | null
          birthday?: string | null
          city?: string | null
          company_id: string
          company_name?: string | null
          contact_type?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          last_contact_date?: string | null
          last_name: string
          lead_source?: string | null
          linkedin_profile?: string | null
          mobile_phone?: string | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          relationship_status?: string
          state?: string | null
          tags?: string[] | null
          time_zone?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          anniversary?: string | null
          assigned_to?: string | null
          birthday?: string | null
          city?: string | null
          company_id?: string
          company_name?: string | null
          contact_type?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string
          lead_source?: string | null
          linkedin_profile?: string | null
          mobile_phone?: string | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          relationship_status?: string
          state?: string | null
          tags?: string[] | null
          time_zone?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_payments: {
        Row: {
          amount: number
          company_id: string
          contractor_id: string
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_1099_reportable: boolean | null
          payment_date: string
          payment_method: string | null
          project_id: string | null
          reference_number: string | null
          tax_year: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          contractor_id: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_1099_reportable?: boolean | null
          payment_date?: string
          payment_method?: string | null
          project_id?: string | null
          reference_number?: string | null
          tax_year?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          contractor_id?: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_1099_reportable?: boolean | null
          payment_date?: string
          payment_method?: string | null
          project_id?: string | null
          reference_number?: string | null
          tax_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_payments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_payments_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contractor_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contractor_payments_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          business_name: string
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          tax_id: string | null
          tax_id_type: string | null
          updated_at: string
          w9_file_path: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          updated_at?: string
          w9_file_path?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          updated_at?: string
          w9_file_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_contractors_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      crew_assignments: {
        Row: {
          assigned_date: string
          company_id: string
          created_at: string
          created_by: string | null
          crew_member_id: string
          end_time: string
          id: string
          location: string | null
          notes: string | null
          project_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_date: string
          company_id: string
          created_at?: string
          created_by?: string | null
          crew_member_id: string
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          project_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          crew_member_id?: string
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      custom_forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          form_fields: Json
          form_type: string
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          form_fields?: Json
          form_type: string
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          form_fields?: Json
          form_type?: string
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_service_requests: {
        Row: {
          additional_documents: Json | null
          customer_email: string
          customer_ip_address: unknown | null
          customer_name: string
          customer_notified: boolean | null
          customer_phone: string | null
          id: string
          issue_description: string
          issue_photos: Json | null
          preferred_date: string | null
          preferred_time: string | null
          priority_requested: string | null
          request_number: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_address: string
          service_call_id: string | null
          service_type: string
          status: string
          submission_method: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          additional_documents?: Json | null
          customer_email: string
          customer_ip_address?: unknown | null
          customer_name: string
          customer_notified?: boolean | null
          customer_phone?: string | null
          id?: string
          issue_description: string
          issue_photos?: Json | null
          preferred_date?: string | null
          preferred_time?: string | null
          priority_requested?: string | null
          request_number: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_address: string
          service_call_id?: string | null
          service_type: string
          status?: string
          submission_method?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          additional_documents?: Json | null
          customer_email?: string
          customer_ip_address?: unknown | null
          customer_name?: string
          customer_notified?: boolean | null
          customer_phone?: string | null
          id?: string
          issue_description?: string
          issue_photos?: Json | null
          preferred_date?: string | null
          preferred_time?: string | null
          priority_requested?: string | null
          request_number?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_address?: string
          service_call_id?: string | null
          service_type?: string
          status?: string
          submission_method?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_service_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_service_requests_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
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
      data_classifications: {
        Row: {
          access_restrictions: Json | null
          classification: Database["public"]["Enums"]["data_classification"]
          classification_reason: string | null
          company_id: string
          compliance_requirements: string[] | null
          created_at: string
          created_by: string | null
          data_owner: string | null
          data_steward: string | null
          data_types: string[] | null
          id: string
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          legal_basis: string | null
          processing_purpose: string | null
          resource_id: string
          resource_name: string | null
          resource_type: string
          retention_period_months: number | null
          review_date: string | null
          sensitivity_tags: string[] | null
          updated_at: string
        }
        Insert: {
          access_restrictions?: Json | null
          classification?: Database["public"]["Enums"]["data_classification"]
          classification_reason?: string | null
          company_id: string
          compliance_requirements?: string[] | null
          created_at?: string
          created_by?: string | null
          data_owner?: string | null
          data_steward?: string | null
          data_types?: string[] | null
          id?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          legal_basis?: string | null
          processing_purpose?: string | null
          resource_id: string
          resource_name?: string | null
          resource_type: string
          retention_period_months?: number | null
          review_date?: string | null
          sensitivity_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          access_restrictions?: Json | null
          classification?: Database["public"]["Enums"]["data_classification"]
          classification_reason?: string | null
          company_id?: string
          compliance_requirements?: string[] | null
          created_at?: string
          created_by?: string | null
          data_owner?: string | null
          data_steward?: string | null
          data_types?: string[] | null
          id?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          legal_basis?: string | null
          processing_purpose?: string | null
          resource_id?: string
          resource_name?: string | null
          resource_type?: string
          retention_period_months?: number | null
          review_date?: string | null
          sensitivity_tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
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
      deal_activities: {
        Row: {
          activity_type: string
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string
          deal_id: string
          description: string | null
          document_id: string | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          is_automated: boolean | null
          is_completed: boolean | null
          metadata: Json | null
          next_action: string | null
          outcome: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by: string
          deal_id: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          is_automated?: boolean | null
          is_completed?: boolean | null
          metadata?: Json | null
          next_action?: string | null
          outcome?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string
          deal_id?: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          is_automated?: boolean | null
          is_completed?: boolean | null
          metadata?: Json | null
          next_action?: string | null
          outcome?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          auto_moved: boolean | null
          days_in_previous_stage: number | null
          deal_id: string
          from_stage_id: string | null
          id: string
          moved_at: string | null
          moved_by: string | null
          notes: string | null
          probability_after: number | null
          probability_before: number | null
          to_stage_id: string
          value_after: number | null
          value_before: number | null
        }
        Insert: {
          auto_moved?: boolean | null
          days_in_previous_stage?: number | null
          deal_id: string
          from_stage_id?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string | null
          notes?: string | null
          probability_after?: number | null
          probability_before?: number | null
          to_stage_id: string
          value_after?: number | null
          value_before?: number | null
        }
        Update: {
          auto_moved?: boolean | null
          days_in_previous_stage?: number | null
          deal_id?: string
          from_stage_id?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string | null
          notes?: string | null
          probability_after?: number | null
          probability_before?: number | null
          to_stage_id?: string
          value_after?: number | null
          value_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_manager_id: string | null
          actual_close_date: string | null
          actual_value: number | null
          company_id: string
          competitive_advantage: string | null
          competitors: Json | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          current_stage_id: string | null
          custom_fields: Json | null
          deal_type: string | null
          description: string | null
          estimated_value: number
          expected_close_date: string | null
          id: string
          key_success_factors: Json | null
          lead_id: string | null
          lost_reason: string | null
          lost_to_competitor: string | null
          mitigation_strategies: string | null
          name: string
          pipeline_template_id: string | null
          primary_contact_id: string | null
          priority: string | null
          risk_factors: Json | null
          risk_level: string | null
          sales_rep_id: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          won_reason: string | null
        }
        Insert: {
          account_manager_id?: string | null
          actual_close_date?: string | null
          actual_value?: number | null
          company_id: string
          competitive_advantage?: string | null
          competitors?: Json | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage_id?: string | null
          custom_fields?: Json | null
          deal_type?: string | null
          description?: string | null
          estimated_value?: number
          expected_close_date?: string | null
          id?: string
          key_success_factors?: Json | null
          lead_id?: string | null
          lost_reason?: string | null
          lost_to_competitor?: string | null
          mitigation_strategies?: string | null
          name: string
          pipeline_template_id?: string | null
          primary_contact_id?: string | null
          priority?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          sales_rep_id?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          won_reason?: string | null
        }
        Update: {
          account_manager_id?: string | null
          actual_close_date?: string | null
          actual_value?: number | null
          company_id?: string
          competitive_advantage?: string | null
          competitors?: Json | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage_id?: string | null
          custom_fields?: Json | null
          deal_type?: string | null
          description?: string | null
          estimated_value?: number
          expected_close_date?: string | null
          id?: string
          key_success_factors?: Json | null
          lead_id?: string | null
          lost_reason?: string | null
          lost_to_competitor?: string | null
          mitigation_strategies?: string | null
          name?: string
          pipeline_template_id?: string | null
          primary_contact_id?: string | null
          priority?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          sales_rep_id?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          won_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_template_id_fkey"
            columns: ["pipeline_template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
      document_versions: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          document_id: string
          file_path: string
          file_size: number | null
          id: string
          is_current: boolean | null
          version_notes: string | null
          version_number: number
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          file_path: string
          file_size?: number | null
          id?: string
          is_current?: boolean | null
          version_notes?: string | null
          version_number: number
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_current?: boolean | null
          version_notes?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_classification: Json | null
          approved_at: string | null
          approved_by: string | null
          auto_routed: boolean | null
          category_id: string | null
          checksum: string | null
          company_id: string
          created_at: string
          description: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_current_version: boolean | null
          name: string
          ocr_text: string | null
          parent_document_id: string | null
          project_id: string | null
          routing_confidence: string | null
          updated_at: string
          uploaded_by: string | null
          version: number | null
          version_notes: string | null
        }
        Insert: {
          ai_classification?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          auto_routed?: boolean | null
          category_id?: string | null
          checksum?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean | null
          name: string
          ocr_text?: string | null
          parent_document_id?: string | null
          project_id?: string | null
          routing_confidence?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Update: {
          ai_classification?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          auto_routed?: boolean | null
          category_id?: string | null
          checksum?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean | null
          name?: string
          ocr_text?: string | null
          parent_document_id?: string | null
          project_id?: string | null
          routing_confidence?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
      email_campaign_analytics: {
        Row: {
          campaign_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          subscriber_id: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          subscriber_id: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          subscriber_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_analytics_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          campaign_type: string
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          integration_id: string
          name: string
          recipient_list_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          total_bounced: number | null
          total_clicked: number | null
          total_opened: number | null
          total_recipients: number | null
          total_sent: number | null
          total_unsubscribed: number | null
          updated_at: string
        }
        Insert: {
          campaign_type?: string
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          integration_id: string
          name: string
          recipient_list_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          total_bounced?: number | null
          total_clicked?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          integration_id?: string
          name?: string
          recipient_list_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          total_bounced?: number | null
          total_clicked?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "email_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_recipient_list_id_fkey"
            columns: ["recipient_list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_integrations: {
        Row: {
          company_id: string
          configuration: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_tested_at: string | null
          provider_name: string
          provider_type: string
          test_status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          configuration?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          provider_name: string
          provider_type: string
          test_status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          configuration?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          provider_name?: string
          provider_type?: string
          test_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_list_subscribers: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          list_id: string
          subscriber_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          list_id: string
          subscriber_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          list_id?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_list_subscribers_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_list_subscribers_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lists: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          subscriber_count: number | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          subscriber_count?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subscriber_count?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          custom_fields: Json | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          source: string | null
          status: string
          subscribed_at: string
          tags: string[] | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          source?: string | null
          status?: string
          subscribed_at?: string
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          source?: string | null
          status?: string
          subscribed_at?: string
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_subscribers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_subscribers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string | null
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_system_template: boolean | null
          last_used_at: string | null
          name: string
          subject: string
          template_type: string
          updated_at: string
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_system_template?: boolean | null
          last_used_at?: string | null
          name: string
          subject: string
          template_type?: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_system_template?: boolean | null
          last_used_at?: string | null
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_assessments: {
        Row: {
          adaptive_management_plan: string | null
          adaptive_management_triggers: Json | null
          air_quality_impact: string | null
          alternatives_considered: Json | null
          approved_by: string | null
          assessment_document_path: string | null
          assessment_type: string
          comment_response_document_path: string | null
          comments_received: number | null
          company_id: string
          cooperating_agencies: string[] | null
          created_at: string
          cultural_resources_impact: string | null
          cumulative_impact: string | null
          decision_date: string | null
          decision_rationale: string | null
          finding: string | null
          gis_data_path: string | null
          id: string
          lead_agency: string
          mitigation_measures: Json | null
          monitoring_commitments: Json | null
          nepa_process_stage: string | null
          no_action_alternative: string | null
          noise_impact: string | null
          permit_id: string
          photos_path: string | null
          post_decision_monitoring: string | null
          preferred_alternative: string | null
          prepared_by: string | null
          project_id: string | null
          public_meetings_held: Json | null
          purpose_and_need: string | null
          reviewed_by: string | null
          scoping_period_end: string | null
          scoping_period_start: string | null
          socioeconomic_impact: string | null
          soil_impact: string | null
          stakeholder_engagement_plan: string | null
          supporting_studies: Json | null
          updated_at: string
          vegetation_impact: string | null
          visual_impact: string | null
          water_quality_impact: string | null
          wildlife_impact: string | null
        }
        Insert: {
          adaptive_management_plan?: string | null
          adaptive_management_triggers?: Json | null
          air_quality_impact?: string | null
          alternatives_considered?: Json | null
          approved_by?: string | null
          assessment_document_path?: string | null
          assessment_type: string
          comment_response_document_path?: string | null
          comments_received?: number | null
          company_id: string
          cooperating_agencies?: string[] | null
          created_at?: string
          cultural_resources_impact?: string | null
          cumulative_impact?: string | null
          decision_date?: string | null
          decision_rationale?: string | null
          finding?: string | null
          gis_data_path?: string | null
          id?: string
          lead_agency: string
          mitigation_measures?: Json | null
          monitoring_commitments?: Json | null
          nepa_process_stage?: string | null
          no_action_alternative?: string | null
          noise_impact?: string | null
          permit_id: string
          photos_path?: string | null
          post_decision_monitoring?: string | null
          preferred_alternative?: string | null
          prepared_by?: string | null
          project_id?: string | null
          public_meetings_held?: Json | null
          purpose_and_need?: string | null
          reviewed_by?: string | null
          scoping_period_end?: string | null
          scoping_period_start?: string | null
          socioeconomic_impact?: string | null
          soil_impact?: string | null
          stakeholder_engagement_plan?: string | null
          supporting_studies?: Json | null
          updated_at?: string
          vegetation_impact?: string | null
          visual_impact?: string | null
          water_quality_impact?: string | null
          wildlife_impact?: string | null
        }
        Update: {
          adaptive_management_plan?: string | null
          adaptive_management_triggers?: Json | null
          air_quality_impact?: string | null
          alternatives_considered?: Json | null
          approved_by?: string | null
          assessment_document_path?: string | null
          assessment_type?: string
          comment_response_document_path?: string | null
          comments_received?: number | null
          company_id?: string
          cooperating_agencies?: string[] | null
          created_at?: string
          cultural_resources_impact?: string | null
          cumulative_impact?: string | null
          decision_date?: string | null
          decision_rationale?: string | null
          finding?: string | null
          gis_data_path?: string | null
          id?: string
          lead_agency?: string
          mitigation_measures?: Json | null
          monitoring_commitments?: Json | null
          nepa_process_stage?: string | null
          no_action_alternative?: string | null
          noise_impact?: string | null
          permit_id?: string
          photos_path?: string | null
          post_decision_monitoring?: string | null
          preferred_alternative?: string | null
          prepared_by?: string | null
          project_id?: string | null
          public_meetings_held?: Json | null
          purpose_and_need?: string | null
          reviewed_by?: string | null
          scoping_period_end?: string | null
          scoping_period_start?: string | null
          socioeconomic_impact?: string | null
          soil_impact?: string | null
          stakeholder_engagement_plan?: string | null
          supporting_studies?: Json | null
          updated_at?: string
          vegetation_impact?: string | null
          visual_impact?: string | null
          water_quality_impact?: string | null
          wildlife_impact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environmental_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_assessments_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "environmental_permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_assessments_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "environmental_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_monitoring: {
        Row: {
          calibration_date: string | null
          certified_lab: boolean | null
          chain_of_custody_number: string | null
          collected_by: string | null
          company_id: string
          corrective_action_triggered: boolean | null
          created_at: string
          data_file_path: string | null
          equipment_used: string | null
          exceedance_level: number | null
          field_notes: string | null
          frequency_required: string | null
          gps_coordinates: unknown | null
          humidity: number | null
          id: string
          lab_name: string | null
          measured_value: number | null
          measurement_date: string
          measurement_method: string | null
          measurement_unit: string | null
          monitoring_location: string | null
          monitoring_type: string
          parameter_measured: string
          permit_id: string
          permit_limit: number | null
          photos: Json | null
          qa_qc_notes: string | null
          regulatory_limit: number | null
          temperature: number | null
          updated_at: string
          verified_by: string | null
          weather_conditions: string | null
          wind_direction: string | null
          wind_speed: number | null
          within_limits: boolean | null
        }
        Insert: {
          calibration_date?: string | null
          certified_lab?: boolean | null
          chain_of_custody_number?: string | null
          collected_by?: string | null
          company_id: string
          corrective_action_triggered?: boolean | null
          created_at?: string
          data_file_path?: string | null
          equipment_used?: string | null
          exceedance_level?: number | null
          field_notes?: string | null
          frequency_required?: string | null
          gps_coordinates?: unknown | null
          humidity?: number | null
          id?: string
          lab_name?: string | null
          measured_value?: number | null
          measurement_date: string
          measurement_method?: string | null
          measurement_unit?: string | null
          monitoring_location?: string | null
          monitoring_type: string
          parameter_measured: string
          permit_id: string
          permit_limit?: number | null
          photos?: Json | null
          qa_qc_notes?: string | null
          regulatory_limit?: number | null
          temperature?: number | null
          updated_at?: string
          verified_by?: string | null
          weather_conditions?: string | null
          wind_direction?: string | null
          wind_speed?: number | null
          within_limits?: boolean | null
        }
        Update: {
          calibration_date?: string | null
          certified_lab?: boolean | null
          chain_of_custody_number?: string | null
          collected_by?: string | null
          company_id?: string
          corrective_action_triggered?: boolean | null
          created_at?: string
          data_file_path?: string | null
          equipment_used?: string | null
          exceedance_level?: number | null
          field_notes?: string | null
          frequency_required?: string | null
          gps_coordinates?: unknown | null
          humidity?: number | null
          id?: string
          lab_name?: string | null
          measured_value?: number | null
          measurement_date?: string
          measurement_method?: string | null
          measurement_unit?: string | null
          monitoring_location?: string | null
          monitoring_type?: string
          parameter_measured?: string
          permit_id?: string
          permit_limit?: number | null
          photos?: Json | null
          qa_qc_notes?: string | null
          regulatory_limit?: number | null
          temperature?: number | null
          updated_at?: string
          verified_by?: string | null
          weather_conditions?: string | null
          wind_direction?: string | null
          wind_speed?: number | null
          within_limits?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "environmental_monitoring_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_monitoring_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_monitoring_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "environmental_permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_monitoring_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_permits: {
        Row: {
          agency_contact_email: string | null
          agency_contact_name: string | null
          agency_contact_phone: string | null
          annual_fee: number | null
          application_date: string | null
          application_document_path: string | null
          application_fee: number | null
          assigned_to: string | null
          company_id: string
          compliance_bond_amount: number | null
          compliance_status: string | null
          created_at: string
          created_by: string | null
          decision_date: string | null
          description: string | null
          effective_date: string | null
          environmental_impact_summary: string | null
          expiration_date: string | null
          id: string
          interagency_coordination: Json | null
          internal_notes: string | null
          issuing_agency: string
          last_inspection_date: string | null
          mitigation_measures: Json | null
          monitoring_plan: string | null
          monitoring_requirements: Json | null
          nepa_category: string | null
          nepa_class_of_action: string | null
          nepa_document_type: string | null
          next_inspection_date: string | null
          permit_conditions: Json | null
          permit_document_path: string | null
          permit_name: string
          permit_number: string
          permit_type: string
          priority: string | null
          project_id: string | null
          public_comment_period_end: string | null
          public_comment_period_start: string | null
          public_hearing_date: string | null
          public_hearing_scheduled: boolean | null
          regulatory_framework: string | null
          renewal_application_deadline: string | null
          renewal_notice_date: string | null
          renewal_required: boolean | null
          reporting_requirements: Json | null
          review_start_date: string | null
          status: string
          supporting_documents: Json | null
          target_decision_date: string | null
          tribal_consultation_required: boolean | null
          tribal_consultation_status: string | null
          updated_at: string
          violations: Json | null
        }
        Insert: {
          agency_contact_email?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          annual_fee?: number | null
          application_date?: string | null
          application_document_path?: string | null
          application_fee?: number | null
          assigned_to?: string | null
          company_id: string
          compliance_bond_amount?: number | null
          compliance_status?: string | null
          created_at?: string
          created_by?: string | null
          decision_date?: string | null
          description?: string | null
          effective_date?: string | null
          environmental_impact_summary?: string | null
          expiration_date?: string | null
          id?: string
          interagency_coordination?: Json | null
          internal_notes?: string | null
          issuing_agency: string
          last_inspection_date?: string | null
          mitigation_measures?: Json | null
          monitoring_plan?: string | null
          monitoring_requirements?: Json | null
          nepa_category?: string | null
          nepa_class_of_action?: string | null
          nepa_document_type?: string | null
          next_inspection_date?: string | null
          permit_conditions?: Json | null
          permit_document_path?: string | null
          permit_name: string
          permit_number: string
          permit_type: string
          priority?: string | null
          project_id?: string | null
          public_comment_period_end?: string | null
          public_comment_period_start?: string | null
          public_hearing_date?: string | null
          public_hearing_scheduled?: boolean | null
          regulatory_framework?: string | null
          renewal_application_deadline?: string | null
          renewal_notice_date?: string | null
          renewal_required?: boolean | null
          reporting_requirements?: Json | null
          review_start_date?: string | null
          status?: string
          supporting_documents?: Json | null
          target_decision_date?: string | null
          tribal_consultation_required?: boolean | null
          tribal_consultation_status?: string | null
          updated_at?: string
          violations?: Json | null
        }
        Update: {
          agency_contact_email?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          annual_fee?: number | null
          application_date?: string | null
          application_document_path?: string | null
          application_fee?: number | null
          assigned_to?: string | null
          company_id?: string
          compliance_bond_amount?: number | null
          compliance_status?: string | null
          created_at?: string
          created_by?: string | null
          decision_date?: string | null
          description?: string | null
          effective_date?: string | null
          environmental_impact_summary?: string | null
          expiration_date?: string | null
          id?: string
          interagency_coordination?: Json | null
          internal_notes?: string | null
          issuing_agency?: string
          last_inspection_date?: string | null
          mitigation_measures?: Json | null
          monitoring_plan?: string | null
          monitoring_requirements?: Json | null
          nepa_category?: string | null
          nepa_class_of_action?: string | null
          nepa_document_type?: string | null
          next_inspection_date?: string | null
          permit_conditions?: Json | null
          permit_document_path?: string | null
          permit_name?: string
          permit_number?: string
          permit_type?: string
          priority?: string | null
          project_id?: string | null
          public_comment_period_end?: string | null
          public_comment_period_start?: string | null
          public_hearing_date?: string | null
          public_hearing_scheduled?: boolean | null
          regulatory_framework?: string | null
          renewal_application_deadline?: string | null
          renewal_notice_date?: string | null
          renewal_required?: boolean | null
          reporting_requirements?: Json | null
          review_start_date?: string | null
          status?: string
          supporting_documents?: Json | null
          target_decision_date?: string | null
          tribal_consultation_required?: boolean | null
          tribal_consultation_status?: string | null
          updated_at?: string
          violations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "environmental_permits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_permits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_permits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environmental_permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "environmental_permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      equipment_assignments: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          assigned_by: string | null
          assigned_quantity: number
          assignment_status: string
          company_id: string
          created_at: string
          end_date: string
          equipment_id: string
          id: string
          notes: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          project_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_by?: string | null
          assigned_quantity?: number
          assignment_status?: string
          company_id: string
          created_at?: string
          end_date: string
          equipment_id: string
          id?: string
          notes?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          project_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_by?: string | null
          assigned_quantity?: number
          assignment_status?: string
          company_id?: string
          created_at?: string
          end_date?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          project_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_equipment_assignments_assigned_by"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipment_assignments_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipment_assignments_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_equipment_assignments_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance_records: {
        Row: {
          actual_completion_date: string | null
          actual_start_date: string | null
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          compliance_notes: string | null
          compliance_verified: boolean | null
          condition_after: string | null
          condition_before: string | null
          created_at: string
          created_by: string | null
          description: string | null
          downtime_hours: number | null
          equipment_id: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          hour_meter_reading: number | null
          id: string
          inspection_report_path: string | null
          issues_found: string | null
          labor_cost: number | null
          maintenance_schedule_id: string | null
          maintenance_type: string
          parts_cost: number | null
          parts_used: Json | null
          performed_by: string | null
          photos_after: Json | null
          photos_before: Json | null
          procedures_followed: string | null
          quality_check_passed: boolean | null
          quality_notes: string | null
          receipts_path: string | null
          recommendations: string | null
          safety_incidents: string | null
          safety_protocols_followed: boolean | null
          scheduled_date: string | null
          supervisor: string | null
          task_name: string
          technician_names: string[] | null
          tools_used: string[] | null
          total_cost: number | null
          total_labor_hours: number | null
          updated_at: string
          vendor_cost: number | null
          vendor_name: string | null
          warranty_claim_number: string | null
          warranty_work: boolean | null
          work_order_number: string | null
          work_performed: string
        }
        Insert: {
          actual_completion_date?: string | null
          actual_start_date?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          compliance_notes?: string | null
          compliance_verified?: boolean | null
          condition_after?: string | null
          condition_before?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          downtime_hours?: number | null
          equipment_id: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          hour_meter_reading?: number | null
          id?: string
          inspection_report_path?: string | null
          issues_found?: string | null
          labor_cost?: number | null
          maintenance_schedule_id?: string | null
          maintenance_type: string
          parts_cost?: number | null
          parts_used?: Json | null
          performed_by?: string | null
          photos_after?: Json | null
          photos_before?: Json | null
          procedures_followed?: string | null
          quality_check_passed?: boolean | null
          quality_notes?: string | null
          receipts_path?: string | null
          recommendations?: string | null
          safety_incidents?: string | null
          safety_protocols_followed?: boolean | null
          scheduled_date?: string | null
          supervisor?: string | null
          task_name: string
          technician_names?: string[] | null
          tools_used?: string[] | null
          total_cost?: number | null
          total_labor_hours?: number | null
          updated_at?: string
          vendor_cost?: number | null
          vendor_name?: string | null
          warranty_claim_number?: string | null
          warranty_work?: boolean | null
          work_order_number?: string | null
          work_performed: string
        }
        Update: {
          actual_completion_date?: string | null
          actual_start_date?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          compliance_notes?: string | null
          compliance_verified?: boolean | null
          condition_after?: string | null
          condition_before?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          downtime_hours?: number | null
          equipment_id?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          hour_meter_reading?: number | null
          id?: string
          inspection_report_path?: string | null
          issues_found?: string | null
          labor_cost?: number | null
          maintenance_schedule_id?: string | null
          maintenance_type?: string
          parts_cost?: number | null
          parts_used?: Json | null
          performed_by?: string | null
          photos_after?: Json | null
          photos_before?: Json | null
          procedures_followed?: string | null
          quality_check_passed?: boolean | null
          quality_notes?: string | null
          receipts_path?: string | null
          recommendations?: string | null
          safety_incidents?: string | null
          safety_protocols_followed?: boolean | null
          scheduled_date?: string | null
          supervisor?: string | null
          task_name?: string
          technician_names?: string[] | null
          tools_used?: string[] | null
          total_cost?: number | null
          total_labor_hours?: number | null
          updated_at?: string
          vendor_cost?: number | null
          vendor_name?: string | null
          warranty_claim_number?: string | null
          warranty_work?: boolean | null
          work_order_number?: string | null
          work_performed?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_records_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "equipment_maintenance_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_records_supervisor_fkey"
            columns: ["supervisor"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance_schedule: {
        Row: {
          assigned_technician: string | null
          assigned_vendor_contact: string | null
          certification_required: boolean | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          equipment_id: string
          estimated_cost: number | null
          estimated_duration_hours: number | null
          frequency_type: string | null
          frequency_value: number
          hours_at_last_service: number | null
          id: string
          is_active: boolean | null
          last_completed_date: string | null
          lead_time_days: number | null
          maintenance_category: string | null
          maintenance_checklist: Json | null
          maintenance_type: string
          next_due_date: string
          next_due_hours: number | null
          parts_required: Json | null
          priority: string | null
          procedure_document_path: string | null
          regulation_reference: string | null
          regulatory_requirement: boolean | null
          safety_procedures: string | null
          safety_requirements: string[] | null
          skills_required: string[] | null
          status: string | null
          task_name: string
          tools_required: string[] | null
          updated_at: string
          vendor_name: string | null
          vendor_required: boolean | null
        }
        Insert: {
          assigned_technician?: string | null
          assigned_vendor_contact?: string | null
          certification_required?: boolean | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_id: string
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          frequency_type?: string | null
          frequency_value: number
          hours_at_last_service?: number | null
          id?: string
          is_active?: boolean | null
          last_completed_date?: string | null
          lead_time_days?: number | null
          maintenance_category?: string | null
          maintenance_checklist?: Json | null
          maintenance_type: string
          next_due_date: string
          next_due_hours?: number | null
          parts_required?: Json | null
          priority?: string | null
          procedure_document_path?: string | null
          regulation_reference?: string | null
          regulatory_requirement?: boolean | null
          safety_procedures?: string | null
          safety_requirements?: string[] | null
          skills_required?: string[] | null
          status?: string | null
          task_name: string
          tools_required?: string[] | null
          updated_at?: string
          vendor_name?: string | null
          vendor_required?: boolean | null
        }
        Update: {
          assigned_technician?: string | null
          assigned_vendor_contact?: string | null
          certification_required?: boolean | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_id?: string
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          frequency_type?: string | null
          frequency_value?: number
          hours_at_last_service?: number | null
          id?: string
          is_active?: boolean | null
          last_completed_date?: string | null
          lead_time_days?: number | null
          maintenance_category?: string | null
          maintenance_checklist?: Json | null
          maintenance_type?: string
          next_due_date?: string
          next_due_hours?: number | null
          parts_required?: Json | null
          priority?: string | null
          procedure_document_path?: string | null
          regulation_reference?: string | null
          regulatory_requirement?: boolean | null
          safety_procedures?: string | null
          safety_requirements?: string[] | null
          skills_required?: string[] | null
          status?: string | null
          task_name?: string
          tools_required?: string[] | null
          updated_at?: string
          vendor_name?: string | null
          vendor_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_schedule_assigned_technician_fkey"
            columns: ["assigned_technician"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_schedule_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_schedule_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_schedule_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
      equipment_utilization_detailed: {
        Row: {
          activity_description: string | null
          activity_type: string | null
          billable_amount: number | null
          billable_hours: number | null
          calculated_hours: number | null
          company_id: string
          created_at: string
          daily_rate: number | null
          date: string
          downtime_hours: number | null
          downtime_reason: string | null
          end_hour_reading: number | null
          end_time: string | null
          equipment_id: string
          fuel_consumed: number | null
          fuel_cost: number | null
          hourly_rate: number | null
          id: string
          issues_reported: string | null
          location: string | null
          maintenance_required: boolean | null
          operating_efficiency: number | null
          operator_id: string | null
          photos: Json | null
          productivity_metric: string | null
          productivity_unit: string | null
          productivity_value: number | null
          project_id: string | null
          recorded_by: string | null
          start_hour_reading: number | null
          start_time: string | null
          terrain_type: string | null
          total_cost: number | null
          total_hours: number
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          weather_conditions: string | null
          work_order_reference: string | null
        }
        Insert: {
          activity_description?: string | null
          activity_type?: string | null
          billable_amount?: number | null
          billable_hours?: number | null
          calculated_hours?: number | null
          company_id: string
          created_at?: string
          daily_rate?: number | null
          date: string
          downtime_hours?: number | null
          downtime_reason?: string | null
          end_hour_reading?: number | null
          end_time?: string | null
          equipment_id: string
          fuel_consumed?: number | null
          fuel_cost?: number | null
          hourly_rate?: number | null
          id?: string
          issues_reported?: string | null
          location?: string | null
          maintenance_required?: boolean | null
          operating_efficiency?: number | null
          operator_id?: string | null
          photos?: Json | null
          productivity_metric?: string | null
          productivity_unit?: string | null
          productivity_value?: number | null
          project_id?: string | null
          recorded_by?: string | null
          start_hour_reading?: number | null
          start_time?: string | null
          terrain_type?: string | null
          total_cost?: number | null
          total_hours: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          weather_conditions?: string | null
          work_order_reference?: string | null
        }
        Update: {
          activity_description?: string | null
          activity_type?: string | null
          billable_amount?: number | null
          billable_hours?: number | null
          calculated_hours?: number | null
          company_id?: string
          created_at?: string
          daily_rate?: number | null
          date?: string
          downtime_hours?: number | null
          downtime_reason?: string | null
          end_hour_reading?: number | null
          end_time?: string | null
          equipment_id?: string
          fuel_consumed?: number | null
          fuel_cost?: number | null
          hourly_rate?: number | null
          id?: string
          issues_reported?: string | null
          location?: string | null
          maintenance_required?: boolean | null
          operating_efficiency?: number | null
          operator_id?: string | null
          photos?: Json | null
          productivity_metric?: string | null
          productivity_unit?: string | null
          productivity_value?: number | null
          project_id?: string | null
          recorded_by?: string | null
          start_hour_reading?: number | null
          start_time?: string | null
          terrain_type?: string | null
          total_cost?: number | null
          total_hours?: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          weather_conditions?: string | null
          work_order_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_utilization_detailed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_utilization_detailed_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_utilization_detailed_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_utilization_detailed_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_utilization_detailed_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_utilization_detailed_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_utilization_detailed_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_communications: {
        Row: {
          communication_type: string
          created_at: string
          created_by: string | null
          estimate_id: string
          id: string
          message: string | null
          recipient_email: string | null
          responded_at: string | null
          sent_at: string | null
          subject: string | null
          viewed_at: string | null
        }
        Insert: {
          communication_type: string
          created_at?: string
          created_by?: string | null
          estimate_id: string
          id?: string
          message?: string | null
          recipient_email?: string | null
          responded_at?: string | null
          sent_at?: string | null
          subject?: string | null
          viewed_at?: string | null
        }
        Update: {
          communication_type?: string
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          id?: string
          message?: string | null
          recipient_email?: string | null
          responded_at?: string | null
          sent_at?: string | null
          subject?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_communications_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          category: string | null
          cost_code_id: string | null
          created_at: string
          description: string | null
          equipment_cost: number | null
          estimate_id: string
          id: string
          item_name: string
          labor_cost: number | null
          labor_hours: number | null
          labor_rate: number | null
          material_cost: number | null
          quantity: number
          sort_order: number | null
          total_cost: number | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_code_id?: string | null
          created_at?: string
          description?: string | null
          equipment_cost?: number | null
          estimate_id: string
          id?: string
          item_name: string
          labor_cost?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          material_cost?: number | null
          quantity?: number
          sort_order?: number | null
          total_cost?: number | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_code_id?: string | null
          created_at?: string
          description?: string | null
          equipment_cost?: number | null
          estimate_id?: string
          id?: string
          item_name?: string
          labor_cost?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          material_cost?: number | null
          quantity?: number
          sort_order?: number | null
          total_cost?: number | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          accepted_date: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number | null
          estimate_date: string
          estimate_number: string
          id: string
          is_current_version: boolean | null
          markup_percentage: number | null
          notes: string | null
          parent_estimate_id: string | null
          project_id: string | null
          sent_date: string | null
          site_address: string | null
          status: string
          tax_percentage: number | null
          terms_and_conditions: string | null
          title: string
          total_amount: number
          updated_at: string
          valid_until: string | null
          version_number: number
        }
        Insert: {
          accepted_date?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          estimate_date?: string
          estimate_number: string
          id?: string
          is_current_version?: boolean | null
          markup_percentage?: number | null
          notes?: string | null
          parent_estimate_id?: string | null
          project_id?: string | null
          sent_date?: string | null
          site_address?: string | null
          status?: string
          tax_percentage?: number | null
          terms_and_conditions?: string | null
          title: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          version_number?: number
        }
        Update: {
          accepted_date?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          estimate_date?: string
          estimate_number?: string
          id?: string
          is_current_version?: boolean | null
          markup_percentage?: number | null
          notes?: string | null
          parent_estimate_id?: string | null
          project_id?: string | null
          sent_date?: string | null
          site_address?: string | null
          status?: string
          tax_percentage?: number | null
          terms_and_conditions?: string | null
          title?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_parent_estimate_id_fkey"
            columns: ["parent_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
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
            foreignKeyName: "fk_expense_categories_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          company_id: string
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          is_billable: boolean | null
          payment_method: string | null
          payment_status: string | null
          project_id: string | null
          receipt_file_path: string | null
          tax_amount: number | null
          updated_at: string
          vendor_contact: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          company_id: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          is_billable?: boolean | null
          payment_method?: string | null
          payment_status?: string | null
          project_id?: string | null
          receipt_file_path?: string | null
          tax_amount?: number | null
          updated_at?: string
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          company_id?: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          is_billable?: boolean | null
          payment_method?: string | null
          payment_status?: string | null
          project_id?: string | null
          receipt_file_path?: string | null
          tax_amount?: number | null
          updated_at?: string
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_expenses_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      forms_1099: {
        Row: {
          box1_nonemployee_compensation: number
          box2_payer_made_direct_sales: number
          box4_federal_income_tax_withheld: number
          box5_state_tax_withheld: number
          box6_state_payers_state_no: string | null
          box7_state_income: number
          company_id: string
          contractor_address: string
          contractor_id: string
          contractor_name: string
          contractor_tax_id: string
          created_at: string
          filed_by: string | null
          filed_date: string | null
          generated_by: string | null
          generated_date: string
          id: string
          status: string
          tax_year: number
          updated_at: string
        }
        Insert: {
          box1_nonemployee_compensation?: number
          box2_payer_made_direct_sales?: number
          box4_federal_income_tax_withheld?: number
          box5_state_tax_withheld?: number
          box6_state_payers_state_no?: string | null
          box7_state_income?: number
          company_id: string
          contractor_address: string
          contractor_id: string
          contractor_name: string
          contractor_tax_id: string
          created_at?: string
          filed_by?: string | null
          filed_date?: string | null
          generated_by?: string | null
          generated_date?: string
          id?: string
          status?: string
          tax_year: number
          updated_at?: string
        }
        Update: {
          box1_nonemployee_compensation?: number
          box2_payer_made_direct_sales?: number
          box4_federal_income_tax_withheld?: number
          box5_state_tax_withheld?: number
          box6_state_payers_state_no?: string | null
          box7_state_income?: number
          company_id?: string
          contractor_address?: string
          contractor_id?: string
          contractor_name?: string
          contractor_tax_id?: string
          created_at?: string
          filed_by?: string | null
          filed_date?: string | null
          generated_by?: string | null
          generated_date?: string
          id?: string
          status?: string
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_1099_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_1099_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_1099_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_1099_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          funnel_id: string
          id: string
          step_id: string | null
          subscriber_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          funnel_id: string
          id?: string
          step_id?: string | null
          subscriber_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          funnel_id?: string
          id?: string
          step_id?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_analytics_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "lead_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_analytics_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_analytics_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_email_queue: {
        Row: {
          created_at: string
          email_template_id: string
          error_message: string | null
          funnel_subscriber_id: string
          id: string
          retry_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string
          step_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_template_id: string
          error_message?: string | null
          funnel_subscriber_id: string
          id?: string
          retry_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_template_id?: string
          error_message?: string | null
          funnel_subscriber_id?: string
          id?: string
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_email_queue_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_email_queue_funnel_subscriber_id_fkey"
            columns: ["funnel_subscriber_id"]
            isOneToOne: false
            referencedRelation: "funnel_subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_email_queue_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_steps: {
        Row: {
          click_rate: number | null
          conditions: Json | null
          created_at: string
          delay_amount: number
          delay_unit: string
          email_template_id: string | null
          funnel_id: string
          id: string
          is_active: boolean
          name: string
          open_rate: number | null
          step_order: number
          updated_at: string
        }
        Insert: {
          click_rate?: number | null
          conditions?: Json | null
          created_at?: string
          delay_amount?: number
          delay_unit?: string
          email_template_id?: string | null
          funnel_id: string
          id?: string
          is_active?: boolean
          name: string
          open_rate?: number | null
          step_order: number
          updated_at?: string
        }
        Update: {
          click_rate?: number | null
          conditions?: Json | null
          created_at?: string
          delay_amount?: number
          delay_unit?: string
          email_template_id?: string | null
          funnel_id?: string
          id?: string
          is_active?: boolean
          name?: string
          open_rate?: number | null
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_steps_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "lead_funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_subscribers: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number | null
          funnel_id: string
          id: string
          last_email_sent_at: string | null
          metadata: Json | null
          next_email_scheduled_at: string | null
          started_at: string
          status: string
          subscriber_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          funnel_id: string
          id?: string
          last_email_sent_at?: string | null
          metadata?: Json | null
          next_email_scheduled_at?: string | null
          started_at?: string
          status?: string
          subscriber_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          funnel_id?: string
          id?: string
          last_email_sent_at?: string | null
          metadata?: Json | null
          next_email_scheduled_at?: string | null
          started_at?: string
          status?: string
          subscriber_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_subscribers_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "lead_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_subscribers_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      import_field_suggestions: {
        Row: {
          confidence_score: number
          created_at: string
          data_sample: string[] | null
          id: string
          import_session_id: string
          source_field: string
          suggested_target_field: string
        }
        Insert: {
          confidence_score: number
          created_at?: string
          data_sample?: string[] | null
          id?: string
          import_session_id: string
          source_field: string
          suggested_target_field: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          data_sample?: string[] | null
          id?: string
          import_session_id?: string
          source_field?: string
          suggested_target_field?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_field_suggestions_import_session_id_fkey"
            columns: ["import_session_id"]
            isOneToOne: false
            referencedRelation: "import_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_sessions: {
        Row: {
          company_id: string
          confidence_score: number | null
          created_at: string
          created_by: string
          detected_data_type: string | null
          error_log: Json | null
          failed_records: number | null
          field_mappings: Json | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          preview_data: Json | null
          processed_records: number | null
          source_platform: string | null
          status: string
          total_records: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          created_at?: string
          created_by: string
          detected_data_type?: string | null
          error_log?: Json | null
          failed_records?: number | null
          field_mappings?: Json | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          preview_data?: Json | null
          processed_records?: number | null
          source_platform?: string | null
          status?: string
          total_records?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          created_by?: string
          detected_data_type?: string | null
          error_log?: Json | null
          failed_records?: number | null
          field_mappings?: Json | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          preview_data?: Json | null
          processed_records?: number | null
          source_platform?: string | null
          status?: string
          total_records?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          incident_id: string
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          incident_id: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          incident_id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_activities_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_metrics: {
        Row: {
          acknowledgment_time_minutes: number | null
          business_impact_score: number | null
          company_id: string
          created_at: string
          detection_time_minutes: number | null
          escalation_count: number | null
          false_positive: boolean | null
          id: string
          incident_id: string
          resolution_time_minutes: number | null
          response_time_minutes: number | null
          technical_impact_score: number | null
        }
        Insert: {
          acknowledgment_time_minutes?: number | null
          business_impact_score?: number | null
          company_id: string
          created_at?: string
          detection_time_minutes?: number | null
          escalation_count?: number | null
          false_positive?: boolean | null
          id?: string
          incident_id: string
          resolution_time_minutes?: number | null
          response_time_minutes?: number | null
          technical_impact_score?: number | null
        }
        Update: {
          acknowledgment_time_minutes?: number | null
          business_impact_score?: number | null
          company_id?: string
          created_at?: string
          detection_time_minutes?: number | null
          escalation_count?: number | null
          false_positive?: boolean | null
          id?: string
          incident_id?: string
          resolution_time_minutes?: number | null
          response_time_minutes?: number | null
          technical_impact_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_metrics_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_response_playbooks: {
        Row: {
          communication_plan: Json | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          escalation_criteria: Json | null
          estimated_duration_minutes: number | null
          id: string
          incident_types: string[] | null
          is_active: boolean | null
          last_updated_by: string | null
          name: string
          responsibilities: Json | null
          severity_levels: string[] | null
          steps: Json
          updated_at: string
          version: string | null
        }
        Insert: {
          communication_plan?: Json | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_criteria?: Json | null
          estimated_duration_minutes?: number | null
          id?: string
          incident_types?: string[] | null
          is_active?: boolean | null
          last_updated_by?: string | null
          name: string
          responsibilities?: Json | null
          severity_levels?: string[] | null
          steps?: Json
          updated_at?: string
          version?: string | null
        }
        Update: {
          communication_plan?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_criteria?: Json | null
          estimated_duration_minutes?: number | null
          id?: string
          incident_types?: string[] | null
          is_active?: boolean | null
          last_updated_by?: string | null
          name?: string
          responsibilities?: Json | null
          severity_levels?: string[] | null
          steps?: Json
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      incident_response_team: {
        Row: {
          availability_status: string | null
          company_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          escalation_level: number | null
          id: string
          is_active: boolean | null
          name: string
          notification_preferences: Json | null
          role: string
          specializations: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability_status?: string | null
          company_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          escalation_level?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_preferences?: Json | null
          role: string
          specializations?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability_status?: string | null
          company_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          escalation_level?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_preferences?: Json | null
          role?: string
          specializations?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          adjuster_company: string | null
          adjuster_contact: string | null
          adjuster_name: string | null
          affects_premium: boolean | null
          claim_amount: number
          claim_date: string
          claim_description: string
          claim_documents_path: string | null
          claim_number: string
          claim_type: string
          claimant_contact: string | null
          claimant_name: string | null
          correspondence_log: Json | null
          created_at: string
          created_by: string | null
          deductible_amount: number | null
          id: string
          incident_date: string
          insurance_policy_id: string
          photos_path: string | null
          premium_impact_amount: number | null
          project_id: string | null
          reserve_amount: number | null
          resolution_date: string | null
          resolution_notes: string | null
          settlement_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          adjuster_company?: string | null
          adjuster_contact?: string | null
          adjuster_name?: string | null
          affects_premium?: boolean | null
          claim_amount: number
          claim_date: string
          claim_description: string
          claim_documents_path?: string | null
          claim_number: string
          claim_type: string
          claimant_contact?: string | null
          claimant_name?: string | null
          correspondence_log?: Json | null
          created_at?: string
          created_by?: string | null
          deductible_amount?: number | null
          id?: string
          incident_date: string
          insurance_policy_id: string
          photos_path?: string | null
          premium_impact_amount?: number | null
          project_id?: string | null
          reserve_amount?: number | null
          resolution_date?: string | null
          resolution_notes?: string | null
          settlement_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          adjuster_company?: string | null
          adjuster_contact?: string | null
          adjuster_name?: string | null
          affects_premium?: boolean | null
          claim_amount?: number
          claim_date?: string
          claim_description?: string
          claim_documents_path?: string | null
          claim_number?: string
          claim_type?: string
          claimant_contact?: string | null
          claimant_name?: string | null
          correspondence_log?: Json | null
          created_at?: string
          created_by?: string | null
          deductible_amount?: number | null
          id?: string
          incident_date?: string
          insurance_policy_id?: string
          photos_path?: string | null
          premium_impact_amount?: number | null
          project_id?: string | null
          reserve_amount?: number | null
          resolution_date?: string | null
          resolution_notes?: string | null
          settlement_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "insurance_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          additional_insured_required: boolean | null
          agent_company: string | null
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          aggregate_limit: number | null
          carrier_contact_email: string | null
          carrier_contact_name: string | null
          carrier_contact_phone: string | null
          certificate_path: string | null
          claims_count: number | null
          claims_made: boolean | null
          company_id: string
          coverage_limit: number
          created_at: string
          created_by: string | null
          declarations_page_path: string | null
          deductible: number | null
          description: string | null
          effective_date: string
          expiry_date: string
          id: string
          insurance_company: string
          insurance_company_rating: string | null
          issued_date: string | null
          notes: string | null
          per_occurrence_limit: number | null
          policy_document_path: string | null
          policy_name: string
          policy_number: string
          policy_type: string
          premium_amount: number | null
          primary_non_contributory: boolean | null
          status: string
          total_claims_amount: number | null
          updated_at: string
          waiver_of_subrogation: boolean | null
        }
        Insert: {
          additional_insured_required?: boolean | null
          agent_company?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          aggregate_limit?: number | null
          carrier_contact_email?: string | null
          carrier_contact_name?: string | null
          carrier_contact_phone?: string | null
          certificate_path?: string | null
          claims_count?: number | null
          claims_made?: boolean | null
          company_id: string
          coverage_limit: number
          created_at?: string
          created_by?: string | null
          declarations_page_path?: string | null
          deductible?: number | null
          description?: string | null
          effective_date: string
          expiry_date: string
          id?: string
          insurance_company: string
          insurance_company_rating?: string | null
          issued_date?: string | null
          notes?: string | null
          per_occurrence_limit?: number | null
          policy_document_path?: string | null
          policy_name: string
          policy_number: string
          policy_type: string
          premium_amount?: number | null
          primary_non_contributory?: boolean | null
          status?: string
          total_claims_amount?: number | null
          updated_at?: string
          waiver_of_subrogation?: boolean | null
        }
        Update: {
          additional_insured_required?: boolean | null
          agent_company?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          aggregate_limit?: number | null
          carrier_contact_email?: string | null
          carrier_contact_name?: string | null
          carrier_contact_phone?: string | null
          certificate_path?: string | null
          claims_count?: number | null
          claims_made?: boolean | null
          company_id?: string
          coverage_limit?: number
          created_at?: string
          created_by?: string | null
          declarations_page_path?: string | null
          deductible?: number | null
          description?: string | null
          effective_date?: string
          expiry_date?: string
          id?: string
          insurance_company?: string
          insurance_company_rating?: string | null
          issued_date?: string | null
          notes?: string | null
          per_occurrence_limit?: number | null
          policy_document_path?: string | null
          policy_name?: string
          policy_number?: string
          policy_type?: string
          premium_amount?: number | null
          primary_non_contributory?: boolean | null
          status?: string
          total_claims_amount?: number | null
          updated_at?: string
          waiver_of_subrogation?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configurations: {
        Row: {
          company_id: string
          configuration: Json
          created_at: string
          created_by: string | null
          credentials_encrypted: string | null
          error_count: number
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean
          last_error: string | null
          last_sync_at: string | null
          sync_enabled: boolean
          sync_frequency: string
          updated_at: string
        }
        Insert: {
          company_id: string
          configuration?: Json
          created_at?: string
          created_by?: string | null
          credentials_encrypted?: string | null
          error_count?: number
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          sync_enabled?: boolean
          sync_frequency?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          configuration?: Json
          created_at?: string
          created_by?: string | null
          credentials_encrypted?: string | null
          error_count?: number
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          sync_enabled?: boolean
          sync_frequency?: string
          updated_at?: string
        }
        Relationships: []
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
          last_synced_to_qb: string | null
          notes: string | null
          paid_at: string | null
          project_id: string | null
          qb_invoice_id: string | null
          qb_sync_token: string | null
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
          last_synced_to_qb?: string | null
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          qb_invoice_id?: string | null
          qb_sync_token?: string | null
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
          last_synced_to_qb?: string | null
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
          qb_invoice_id?: string | null
          qb_sync_token?: string | null
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
      knowledge_base_articles: {
        Row: {
          article_type: string
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string | null
          difficulty_level: string | null
          estimated_read_time: number | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          sort_order: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          article_type?: string
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          difficulty_level?: string | null
          estimated_read_time?: number | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          article_type?: string
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          difficulty_level?: string | null
          estimated_read_time?: number | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_base_feedback: {
        Row: {
          article_id: string
          created_at: string | null
          feedback_text: string | null
          id: string
          is_helpful: boolean | null
          rating: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean | null
          rating?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean | null
          rating?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_views: {
        Row: {
          article_id: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          article_id: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          article_id?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_burden_rates: {
        Row: {
          annual_hours: number | null
          base_hourly_rate: number
          burden_rate_percentage: number
          company_id: string
          created_at: string
          effective_date: string
          employee_id: string | null
          equipment_allowance_monthly: number | null
          federal_tax_rate: number | null
          fica_rate: number | null
          general_liability_rate: number | null
          health_insurance_monthly: number | null
          id: string
          is_active: boolean | null
          job_title: string
          other_benefits_monthly: number | null
          retirement_contribution_rate: number | null
          state_tax_rate: number | null
          total_hourly_cost: number
          unemployment_rate: number | null
          updated_at: string
          vehicle_allowance_monthly: number | null
          workers_comp_rate: number | null
        }
        Insert: {
          annual_hours?: number | null
          base_hourly_rate: number
          burden_rate_percentage?: number
          company_id: string
          created_at?: string
          effective_date?: string
          employee_id?: string | null
          equipment_allowance_monthly?: number | null
          federal_tax_rate?: number | null
          fica_rate?: number | null
          general_liability_rate?: number | null
          health_insurance_monthly?: number | null
          id?: string
          is_active?: boolean | null
          job_title: string
          other_benefits_monthly?: number | null
          retirement_contribution_rate?: number | null
          state_tax_rate?: number | null
          total_hourly_cost?: number
          unemployment_rate?: number | null
          updated_at?: string
          vehicle_allowance_monthly?: number | null
          workers_comp_rate?: number | null
        }
        Update: {
          annual_hours?: number | null
          base_hourly_rate?: number
          burden_rate_percentage?: number
          company_id?: string
          created_at?: string
          effective_date?: string
          employee_id?: string | null
          equipment_allowance_monthly?: number | null
          federal_tax_rate?: number | null
          fica_rate?: number | null
          general_liability_rate?: number | null
          health_insurance_monthly?: number | null
          id?: string
          is_active?: boolean | null
          job_title?: string
          other_benefits_monthly?: number | null
          retirement_contribution_rate?: number | null
          state_tax_rate?: number | null
          total_hourly_cost?: number
          unemployment_rate?: number | null
          updated_at?: string
          vehicle_allowance_monthly?: number | null
          workers_comp_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_burden_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_burden_rates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_rates: {
        Row: {
          base_rate: number
          company_id: string
          created_at: string
          current_rate: number
          effective_date: string
          efficiency_factor: number | null
          id: string
          overtime_rate: number
          trade: string
          updated_at: string
        }
        Insert: {
          base_rate: number
          company_id: string
          created_at?: string
          current_rate: number
          effective_date?: string
          efficiency_factor?: number | null
          id?: string
          overtime_rate: number
          trade: string
          updated_at?: string
        }
        Update: {
          base_rate?: number
          company_id?: string
          created_at?: string
          current_rate?: number
          effective_date?: string
          efficiency_factor?: number | null
          id?: string
          overtime_rate?: number
          trade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_date: string
          activity_type: string
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string
          metadata: Json | null
          opportunity_id: string | null
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          opportunity_id?: string | null
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attribution: {
        Row: {
          attribution_type: string
          attribution_weight: number | null
          company_id: string
          conversion_value: number | null
          converted_at: string | null
          converted_to_customer: boolean | null
          converted_to_opportunity: boolean | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          lead_id: string
          page_url: string | null
          referrer_url: string | null
          source_id: string
          touched_at: string
          touchpoint_sequence: number | null
          user_agent: string | null
        }
        Insert: {
          attribution_type: string
          attribution_weight?: number | null
          company_id: string
          conversion_value?: number | null
          converted_at?: string | null
          converted_to_customer?: boolean | null
          converted_to_opportunity?: boolean | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          lead_id: string
          page_url?: string | null
          referrer_url?: string | null
          source_id: string
          touched_at: string
          touchpoint_sequence?: number | null
          user_agent?: string | null
        }
        Update: {
          attribution_type?: string
          attribution_weight?: number | null
          company_id?: string
          conversion_value?: number | null
          converted_at?: string | null
          converted_to_customer?: boolean | null
          converted_to_opportunity?: boolean | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          lead_id?: string
          page_url?: string | null
          referrer_url?: string | null
          source_id?: string
          touched_at?: string
          touchpoint_sequence?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attribution_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_attribution_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_attribution_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_behavioral_data: {
        Row: {
          activity_frequency: number | null
          best_contact_time: string | null
          company_id: string
          content_interests: Json | null
          created_at: string | null
          device_types: Json | null
          document_downloads: number | null
          email_clicks: number | null
          email_opens: number | null
          engagement_score: number | null
          form_submissions: number | null
          id: string
          last_activity_at: string | null
          lead_id: string
          locations: Json | null
          meeting_requests: number | null
          page_views: number | null
          phone_calls: number | null
          preferred_communication: string | null
          response_time_avg: number | null
          time_zone: string | null
          updated_at: string | null
          website_visits: number | null
        }
        Insert: {
          activity_frequency?: number | null
          best_contact_time?: string | null
          company_id: string
          content_interests?: Json | null
          created_at?: string | null
          device_types?: Json | null
          document_downloads?: number | null
          email_clicks?: number | null
          email_opens?: number | null
          engagement_score?: number | null
          form_submissions?: number | null
          id?: string
          last_activity_at?: string | null
          lead_id: string
          locations?: Json | null
          meeting_requests?: number | null
          page_views?: number | null
          phone_calls?: number | null
          preferred_communication?: string | null
          response_time_avg?: number | null
          time_zone?: string | null
          updated_at?: string | null
          website_visits?: number | null
        }
        Update: {
          activity_frequency?: number | null
          best_contact_time?: string | null
          company_id?: string
          content_interests?: Json | null
          created_at?: string | null
          device_types?: Json | null
          document_downloads?: number | null
          email_clicks?: number | null
          email_opens?: number | null
          engagement_score?: number | null
          form_submissions?: number | null
          id?: string
          last_activity_at?: string | null
          lead_id?: string
          locations?: Json | null
          meeting_requests?: number | null
          page_views?: number | null
          phone_calls?: number | null
          preferred_communication?: string | null
          response_time_avg?: number | null
          time_zone?: string | null
          updated_at?: string | null
          website_visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_behavioral_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_behavioral_data_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_funnels: {
        Row: {
          company_id: string
          completion_rate: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          total_steps: number | null
          total_subscribers: number | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completion_rate?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          total_steps?: number | null
          total_subscribers?: number | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completion_rate?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          total_steps?: number | null
          total_subscribers?: number | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_funnels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_private: boolean
          lead_id: string
          note_type: string
          opportunity_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_private?: boolean
          lead_id: string
          note_type?: string
          opportunity_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_private?: boolean
          lead_id?: string
          note_type?: string
          opportunity_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_nurturing_campaigns: {
        Row: {
          auto_enrollment: boolean | null
          behavioral_triggers: Json | null
          campaign_name: string
          campaign_type: string | null
          company_id: string
          completion_count: number | null
          conversion_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          enrollment_count: number | null
          id: string
          is_active: boolean | null
          score_threshold: number | null
          start_delay_hours: number | null
          step_delay_hours: number | null
          stop_on_conversion: boolean | null
          stop_on_reply: boolean | null
          target_segments: Json | null
          total_steps: number | null
          updated_at: string | null
        }
        Insert: {
          auto_enrollment?: boolean | null
          behavioral_triggers?: Json | null
          campaign_name: string
          campaign_type?: string | null
          company_id: string
          completion_count?: number | null
          conversion_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enrollment_count?: number | null
          id?: string
          is_active?: boolean | null
          score_threshold?: number | null
          start_delay_hours?: number | null
          step_delay_hours?: number | null
          stop_on_conversion?: boolean | null
          stop_on_reply?: boolean | null
          target_segments?: Json | null
          total_steps?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_enrollment?: boolean | null
          behavioral_triggers?: Json | null
          campaign_name?: string
          campaign_type?: string | null
          company_id?: string
          completion_count?: number | null
          conversion_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enrollment_count?: number | null
          id?: string
          is_active?: boolean | null
          score_threshold?: number | null
          start_delay_hours?: number | null
          step_delay_hours?: number | null
          stop_on_conversion?: boolean | null
          stop_on_reply?: boolean | null
          target_segments?: Json | null
          total_steps?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_nurturing_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_nurturing_enrollments: {
        Row: {
          calls_made: number | null
          campaign_id: string
          company_id: string
          completed_at: string | null
          conversion_date: string | null
          conversion_step: number | null
          converted: boolean | null
          created_at: string | null
          current_step: number | null
          emails_clicked: number | null
          emails_opened: number | null
          emails_sent: number | null
          enrolled_at: string | null
          id: string
          last_step_sent_at: string | null
          lead_id: string
          next_step_scheduled_at: string | null
          status: string | null
          steps_completed: number | null
          stop_reason: string | null
          tasks_created: number | null
          updated_at: string | null
        }
        Insert: {
          calls_made?: number | null
          campaign_id: string
          company_id: string
          completed_at?: string | null
          conversion_date?: string | null
          conversion_step?: number | null
          converted?: boolean | null
          created_at?: string | null
          current_step?: number | null
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          enrolled_at?: string | null
          id?: string
          last_step_sent_at?: string | null
          lead_id: string
          next_step_scheduled_at?: string | null
          status?: string | null
          steps_completed?: number | null
          stop_reason?: string | null
          tasks_created?: number | null
          updated_at?: string | null
        }
        Update: {
          calls_made?: number | null
          campaign_id?: string
          company_id?: string
          completed_at?: string | null
          conversion_date?: string | null
          conversion_step?: number | null
          converted?: boolean | null
          created_at?: string | null
          current_step?: number | null
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          enrolled_at?: string | null
          id?: string
          last_step_sent_at?: string | null
          lead_id?: string
          next_step_scheduled_at?: string | null
          status?: string | null
          steps_completed?: number | null
          stop_reason?: string | null
          tasks_created?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_nurturing_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_nurturing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_nurturing_enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_nurturing_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_qualification_workflows: {
        Row: {
          auto_route_qualified: boolean | null
          auto_route_to_user: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          disqualified_status: string | null
          id: string
          is_active: boolean | null
          qualification_criteria: Json | null
          qualified_status: string | null
          requires_approval: boolean | null
          trigger_events: Json | null
          updated_at: string | null
          workflow_name: string
          workflow_steps: Json | null
        }
        Insert: {
          auto_route_qualified?: boolean | null
          auto_route_to_user?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          disqualified_status?: string | null
          id?: string
          is_active?: boolean | null
          qualification_criteria?: Json | null
          qualified_status?: string | null
          requires_approval?: boolean | null
          trigger_events?: Json | null
          updated_at?: string | null
          workflow_name: string
          workflow_steps?: Json | null
        }
        Update: {
          auto_route_qualified?: boolean | null
          auto_route_to_user?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          disqualified_status?: string | null
          id?: string
          is_active?: boolean | null
          qualification_criteria?: Json | null
          qualified_status?: string | null
          requires_approval?: boolean | null
          trigger_events?: Json | null
          updated_at?: string | null
          workflow_name?: string
          workflow_steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_routing_rules: {
        Row: {
          add_tags: string[] | null
          assign_to_team: string | null
          assign_to_user_id: string | null
          auto_create_tasks: Json | null
          company_id: string
          conditions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_assigned_user_id: string | null
          name: string
          priority: number | null
          round_robin_users: string[] | null
          set_priority: string | null
          updated_at: string | null
          use_round_robin: boolean | null
        }
        Insert: {
          add_tags?: string[] | null
          assign_to_team?: string | null
          assign_to_user_id?: string | null
          auto_create_tasks?: Json | null
          company_id: string
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_assigned_user_id?: string | null
          name: string
          priority?: number | null
          round_robin_users?: string[] | null
          set_priority?: string | null
          updated_at?: string | null
          use_round_robin?: boolean | null
        }
        Update: {
          add_tags?: string[] | null
          assign_to_team?: string | null
          assign_to_user_id?: string | null
          auto_create_tasks?: Json | null
          company_id?: string
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_assigned_user_id?: string | null
          name?: string
          priority?: number | null
          round_robin_users?: string[] | null
          set_priority?: string | null
          updated_at?: string | null
          use_round_robin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_routing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          calculated_at: string
          company_id: string
          id: string
          lead_id: string
          score: number
          score_factors: Json
        }
        Insert: {
          calculated_at?: string
          company_id: string
          id?: string
          lead_id: string
          score?: number
          score_factors?: Json
        }
        Update: {
          calculated_at?: string
          company_id?: string
          id?: string
          lead_id?: string
          score?: number
          score_factors?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          attribution_model: string | null
          attribution_window_days: number | null
          average_deal_size: number | null
          campaign_id: string | null
          campaign_name: string | null
          company_id: string
          content: string | null
          conversion_rate: number | null
          cost_per_lead: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          medium: string | null
          roi_percentage: number | null
          source_category: string | null
          source_name: string
          source_type: string
          term: string | null
          updated_at: string | null
        }
        Insert: {
          attribution_model?: string | null
          attribution_window_days?: number | null
          average_deal_size?: number | null
          campaign_id?: string | null
          campaign_name?: string | null
          company_id: string
          content?: string | null
          conversion_rate?: number | null
          cost_per_lead?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          medium?: string | null
          roi_percentage?: number | null
          source_category?: string | null
          source_name: string
          source_type: string
          term?: string | null
          updated_at?: string | null
        }
        Update: {
          attribution_model?: string | null
          attribution_window_days?: number | null
          average_deal_size?: number | null
          campaign_id?: string | null
          campaign_name?: string | null
          company_id?: string
          content?: string | null
          conversion_rate?: number | null
          cost_per_lead?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          medium?: string | null
          roi_percentage?: number | null
          source_category?: string | null
          source_name?: string
          source_type?: string
          term?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          company_id: string
          company_name: string | null
          created_at: string
          created_by: string | null
          decision_maker: boolean | null
          decision_timeline: string | null
          desired_completion_date: string | null
          desired_start_date: string | null
          email: string | null
          estimated_budget: number | null
          financing_secured: boolean | null
          financing_type: string | null
          first_name: string
          hoa_approval_needed: boolean | null
          id: string
          intent_signals: Json | null
          job_title: string | null
          last_contact_date: string | null
          last_name: string
          lead_source: string
          lead_source_detail: string | null
          lead_source_id: string | null
          lead_temperature: string | null
          next_follow_up_date: string | null
          notes: string | null
          nurturing_status: string | null
          permits_required: boolean | null
          phone: string | null
          priority: string
          project_address: string | null
          project_city: string | null
          project_description: string | null
          project_name: string | null
          project_state: string | null
          project_type: string | null
          project_zip: string | null
          property_type: string | null
          qualification_date: string | null
          qualification_status: string | null
          site_accessible: boolean | null
          site_conditions: string | null
          status: string
          tags: string[] | null
          timeline_flexibility: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          company_id: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          decision_maker?: boolean | null
          decision_timeline?: string | null
          desired_completion_date?: string | null
          desired_start_date?: string | null
          email?: string | null
          estimated_budget?: number | null
          financing_secured?: boolean | null
          financing_type?: string | null
          first_name: string
          hoa_approval_needed?: boolean | null
          id?: string
          intent_signals?: Json | null
          job_title?: string | null
          last_contact_date?: string | null
          last_name: string
          lead_source?: string
          lead_source_detail?: string | null
          lead_source_id?: string | null
          lead_temperature?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          nurturing_status?: string | null
          permits_required?: boolean | null
          phone?: string | null
          priority?: string
          project_address?: string | null
          project_city?: string | null
          project_description?: string | null
          project_name?: string | null
          project_state?: string | null
          project_type?: string | null
          project_zip?: string | null
          property_type?: string | null
          qualification_date?: string | null
          qualification_status?: string | null
          site_accessible?: boolean | null
          site_conditions?: string | null
          status?: string
          tags?: string[] | null
          timeline_flexibility?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          company_id?: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          decision_maker?: boolean | null
          decision_timeline?: string | null
          desired_completion_date?: string | null
          desired_start_date?: string | null
          email?: string | null
          estimated_budget?: number | null
          financing_secured?: boolean | null
          financing_type?: string | null
          first_name?: string
          hoa_approval_needed?: boolean | null
          id?: string
          intent_signals?: Json | null
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string
          lead_source?: string
          lead_source_detail?: string | null
          lead_source_id?: string | null
          lead_temperature?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          nurturing_status?: string | null
          permits_required?: boolean | null
          phone?: string | null
          priority?: string
          project_address?: string | null
          project_city?: string | null
          project_description?: string | null
          project_name?: string | null
          project_state?: string | null
          project_type?: string | null
          project_zip?: string | null
          property_type?: string | null
          qualification_date?: string | null
          qualification_status?: string | null
          site_accessible?: boolean | null
          site_conditions?: string | null
          status?: string
          tags?: string[] | null
          timeline_flexibility?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      material_costs: {
        Row: {
          alert_threshold: number | null
          category: string
          company_id: string
          created_at: string
          current_price: number | null
          id: string
          last_price: number | null
          last_updated: string | null
          name: string
          price_alerts_enabled: boolean | null
          price_change: number | null
          sku: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          alert_threshold?: number | null
          category: string
          company_id: string
          created_at?: string
          current_price?: number | null
          id?: string
          last_price?: number | null
          last_updated?: string | null
          name: string
          price_alerts_enabled?: boolean | null
          price_change?: number | null
          sku?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          alert_threshold?: number | null
          category?: string
          company_id?: string
          created_at?: string
          current_price?: number | null
          id?: string
          last_price?: number | null
          last_updated?: string | null
          name?: string
          price_alerts_enabled?: boolean | null
          price_change?: number | null
          sku?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "material_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_price_history: {
        Row: {
          change_percentage: number | null
          created_at: string
          id: string
          material_id: string
          price: number
          sync_source: string | null
        }
        Insert: {
          change_percentage?: number | null
          created_at?: string
          id?: string
          material_id: string
          price: number
          sync_source?: string | null
        }
        Update: {
          change_percentage?: number | null
          created_at?: string
          id?: string
          material_id?: string
          price?: number
          sync_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_price_history_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_costs"
            referencedColumns: ["id"]
          },
        ]
      }
      material_pricing: {
        Row: {
          company_id: string
          created_at: string
          current_price: number
          id: string
          last_updated: string
          material_name: string
          previous_price: number | null
          price_change_percentage: number | null
          price_trend: string | null
          supplier: string | null
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_price: number
          id?: string
          last_updated?: string
          material_name: string
          previous_price?: number | null
          price_change_percentage?: number | null
          price_trend?: string | null
          supplier?: string | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_price?: number
          id?: string
          last_updated?: string
          material_name?: string
          previous_price?: number | null
          price_change_percentage?: number | null
          price_trend?: string | null
          supplier?: string | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_pricing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      material_suppliers: {
        Row: {
          api_endpoint: string | null
          api_key_configured: boolean | null
          company_id: string
          configuration: Json | null
          created_at: string
          id: string
          last_sync: string | null
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key_configured?: boolean | null
          company_id: string
          configuration?: Json | null
          created_at?: string
          id?: string
          last_sync?: string | null
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_key_configured?: boolean | null
          company_id?: string
          configuration?: Json | null
          created_at?: string
          id?: string
          last_sync?: string | null
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
      notification_rules: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          recipients: Json | null
          template_id: string | null
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          recipients?: Json | null
          template_id?: string | null
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          recipients?: Json | null
          template_id?: string | null
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      nurturing_campaign_steps: {
        Row: {
          campaign_id: string
          content: string | null
          created_at: string | null
          delay_unit: string | null
          delay_value: number | null
          id: string
          is_active: boolean | null
          send_conditions: Json | null
          step_name: string
          step_number: number
          step_type: string
          subject_line: string | null
          template_id: string | null
          track_clicks: boolean | null
          track_opens: boolean | null
          updated_at: string | null
          wait_conditions: Json | null
        }
        Insert: {
          campaign_id: string
          content?: string | null
          created_at?: string | null
          delay_unit?: string | null
          delay_value?: number | null
          id?: string
          is_active?: boolean | null
          send_conditions?: Json | null
          step_name: string
          step_number: number
          step_type: string
          subject_line?: string | null
          template_id?: string | null
          track_clicks?: boolean | null
          track_opens?: boolean | null
          updated_at?: string | null
          wait_conditions?: Json | null
        }
        Update: {
          campaign_id?: string
          content?: string | null
          created_at?: string | null
          delay_unit?: string | null
          delay_value?: number | null
          id?: string
          is_active?: boolean | null
          send_conditions?: Json | null
          step_name?: string
          step_number?: number
          step_type?: string
          subject_line?: string | null
          template_id?: string | null
          track_clicks?: boolean | null
          track_opens?: boolean | null
          updated_at?: string | null
          wait_conditions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nurturing_campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_nurturing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          account_manager: string | null
          actual_value: number | null
          bid_due_date: string | null
          bid_required: boolean | null
          close_date: string | null
          close_reason: string | null
          company_id: string
          competitor_names: string[] | null
          contact_id: string | null
          contract_signed_date: string | null
          created_at: string
          description: string | null
          estimated_value: number
          estimator: string | null
          expected_close_date: string | null
          id: string
          key_decision_factors: string[] | null
          lead_id: string | null
          mitigation_strategies: string | null
          name: string
          notes: string | null
          our_competitive_advantage: string | null
          pipeline_position: number | null
          probability_percent: number
          project_id: string | null
          project_manager: string | null
          project_type: string | null
          proposal_sent_date: string | null
          risk_factors: string[] | null
          risk_level: string
          stage: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          account_manager?: string | null
          actual_value?: number | null
          bid_due_date?: string | null
          bid_required?: boolean | null
          close_date?: string | null
          close_reason?: string | null
          company_id: string
          competitor_names?: string[] | null
          contact_id?: string | null
          contract_signed_date?: string | null
          created_at?: string
          description?: string | null
          estimated_value: number
          estimator?: string | null
          expected_close_date?: string | null
          id?: string
          key_decision_factors?: string[] | null
          lead_id?: string | null
          mitigation_strategies?: string | null
          name: string
          notes?: string | null
          our_competitive_advantage?: string | null
          pipeline_position?: number | null
          probability_percent?: number
          project_id?: string | null
          project_manager?: string | null
          project_type?: string | null
          proposal_sent_date?: string | null
          risk_factors?: string[] | null
          risk_level?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          account_manager?: string | null
          actual_value?: number | null
          bid_due_date?: string | null
          bid_required?: boolean | null
          close_date?: string | null
          close_reason?: string | null
          company_id?: string
          competitor_names?: string[] | null
          contact_id?: string | null
          contract_signed_date?: string | null
          created_at?: string
          description?: string | null
          estimated_value?: number
          estimator?: string | null
          expected_close_date?: string | null
          id?: string
          key_decision_factors?: string[] | null
          lead_id?: string | null
          mitigation_strategies?: string | null
          name?: string
          notes?: string | null
          our_competitive_advantage?: string | null
          pipeline_position?: number | null
          probability_percent?: number
          project_id?: string | null
          project_manager?: string | null
          project_type?: string | null
          proposal_sent_date?: string | null
          risk_factors?: string[] | null
          risk_level?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_account_manager_fkey"
            columns: ["account_manager"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_estimator_fkey"
            columns: ["estimator"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_project_manager_fkey"
            columns: ["project_manager"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      optimized_resource_assignments: {
        Row: {
          allocation_percentage: number | null
          applied_at: string | null
          applied_by: string | null
          assignment_type: string | null
          availability_score: number | null
          breakdown_time_minutes: number | null
          company_id: string
          confidence_score: number | null
          constraints_applied: Json | null
          cost_impact: number | null
          created_at: string
          efficiency_score: number | null
          feedback_notes: string | null
          feedback_rating: number | null
          id: string
          is_applied: boolean | null
          optimization_reason: string | null
          optimization_run_id: string
          optimized_end_datetime: string
          optimized_start_datetime: string
          original_end_datetime: string | null
          original_start_datetime: string | null
          priority_level: number | null
          project_id: string
          resource_id: string
          resource_type: string
          setup_time_minutes: number | null
          skill_match_score: number | null
          task_id: string | null
          travel_time_minutes: number | null
          weather_impact_considered: boolean | null
        }
        Insert: {
          allocation_percentage?: number | null
          applied_at?: string | null
          applied_by?: string | null
          assignment_type?: string | null
          availability_score?: number | null
          breakdown_time_minutes?: number | null
          company_id: string
          confidence_score?: number | null
          constraints_applied?: Json | null
          cost_impact?: number | null
          created_at?: string
          efficiency_score?: number | null
          feedback_notes?: string | null
          feedback_rating?: number | null
          id?: string
          is_applied?: boolean | null
          optimization_reason?: string | null
          optimization_run_id: string
          optimized_end_datetime: string
          optimized_start_datetime: string
          original_end_datetime?: string | null
          original_start_datetime?: string | null
          priority_level?: number | null
          project_id: string
          resource_id: string
          resource_type: string
          setup_time_minutes?: number | null
          skill_match_score?: number | null
          task_id?: string | null
          travel_time_minutes?: number | null
          weather_impact_considered?: boolean | null
        }
        Update: {
          allocation_percentage?: number | null
          applied_at?: string | null
          applied_by?: string | null
          assignment_type?: string | null
          availability_score?: number | null
          breakdown_time_minutes?: number | null
          company_id?: string
          confidence_score?: number | null
          constraints_applied?: Json | null
          cost_impact?: number | null
          created_at?: string
          efficiency_score?: number | null
          feedback_notes?: string | null
          feedback_rating?: number | null
          id?: string
          is_applied?: boolean | null
          optimization_reason?: string | null
          optimization_run_id?: string
          optimized_end_datetime?: string
          optimized_start_datetime?: string
          original_end_datetime?: string | null
          original_start_datetime?: string | null
          priority_level?: number | null
          project_id?: string
          resource_id?: string
          resource_type?: string
          setup_time_minutes?: number | null
          skill_match_score?: number | null
          task_id?: string | null
          travel_time_minutes?: number | null
          weather_impact_considered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "optimized_resource_assignments_optimization_run_id_fkey"
            columns: ["optimization_run_id"]
            isOneToOne: false
            referencedRelation: "resource_optimization_runs"
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
      osha_compliance_log: {
        Row: {
          company_id: string
          completed_at: string
          completed_by: string | null
          created_at: string
          evidence_photos: string[] | null
          id: string
          notes: string | null
          project_id: string | null
          requirement_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string
          completed_by?: string | null
          created_at?: string
          evidence_photos?: string[] | null
          id?: string
          notes?: string | null
          project_id?: string | null
          requirement_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string
          completed_by?: string | null
          created_at?: string
          evidence_photos?: string[] | null
          id?: string
          notes?: string | null
          project_id?: string | null
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "osha_compliance_log_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "osha_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      osha_requirements: {
        Row: {
          assigned_to: string | null
          category: string
          company_id: string
          created_at: string
          description: string | null
          frequency: string
          id: string
          last_completed_date: string | null
          next_due_date: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          company_id: string
          created_at?: string
          description?: string | null
          frequency: string
          id?: string
          last_completed_date?: string | null
          next_due_date: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          last_completed_date?: string | null
          next_due_date?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      password_policies: {
        Row: {
          account_locked_until: string | null
          company_id: string | null
          created_at: string
          failed_login_attempts: number | null
          id: string
          password_expires_at: string | null
          password_history: string[] | null
          password_last_changed: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_locked_until?: string | null
          company_id?: string | null
          created_at?: string
          failed_login_attempts?: number | null
          id?: string
          password_expires_at?: string | null
          password_history?: string[] | null
          password_last_changed?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_locked_until?: string | null
          company_id?: string | null
          created_at?: string
          failed_login_attempts?: number | null
          id?: string
          password_expires_at?: string | null
          password_history?: string[] | null
          password_last_changed?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      performance_benchmarks: {
        Row: {
          areas_for_improvement: Json | null
          benchmark_period: string
          company_budget_variance: number | null
          company_client_satisfaction: number | null
          company_employee_productivity: number | null
          company_id: string
          company_profit_margin: number | null
          company_project_completion_rate: number | null
          company_safety_incidents: number | null
          company_size_category: string | null
          competitive_advantages: Json | null
          confidence_score: number | null
          created_at: string
          data_source: string | null
          geographic_region: string | null
          id: string
          industry_avg_budget_variance: number | null
          industry_avg_client_satisfaction: number | null
          industry_avg_completion_rate: number | null
          industry_avg_productivity: number | null
          industry_avg_profit_margin: number | null
          industry_avg_safety_incidents: number | null
          industry_sector: string | null
          market_position_percentile: number | null
          period_end: string
          period_start: string
          top_performer_budget_variance: number | null
          top_performer_client_satisfaction: number | null
          top_performer_completion_rate: number | null
          top_performer_productivity: number | null
          top_performer_profit_margin: number | null
          top_performer_safety_incidents: number | null
          updated_at: string
        }
        Insert: {
          areas_for_improvement?: Json | null
          benchmark_period: string
          company_budget_variance?: number | null
          company_client_satisfaction?: number | null
          company_employee_productivity?: number | null
          company_id: string
          company_profit_margin?: number | null
          company_project_completion_rate?: number | null
          company_safety_incidents?: number | null
          company_size_category?: string | null
          competitive_advantages?: Json | null
          confidence_score?: number | null
          created_at?: string
          data_source?: string | null
          geographic_region?: string | null
          id?: string
          industry_avg_budget_variance?: number | null
          industry_avg_client_satisfaction?: number | null
          industry_avg_completion_rate?: number | null
          industry_avg_productivity?: number | null
          industry_avg_profit_margin?: number | null
          industry_avg_safety_incidents?: number | null
          industry_sector?: string | null
          market_position_percentile?: number | null
          period_end: string
          period_start: string
          top_performer_budget_variance?: number | null
          top_performer_client_satisfaction?: number | null
          top_performer_completion_rate?: number | null
          top_performer_productivity?: number | null
          top_performer_profit_margin?: number | null
          top_performer_safety_incidents?: number | null
          updated_at?: string
        }
        Update: {
          areas_for_improvement?: Json | null
          benchmark_period?: string
          company_budget_variance?: number | null
          company_client_satisfaction?: number | null
          company_employee_productivity?: number | null
          company_id?: string
          company_profit_margin?: number | null
          company_project_completion_rate?: number | null
          company_safety_incidents?: number | null
          company_size_category?: string | null
          competitive_advantages?: Json | null
          confidence_score?: number | null
          created_at?: string
          data_source?: string | null
          geographic_region?: string | null
          id?: string
          industry_avg_budget_variance?: number | null
          industry_avg_client_satisfaction?: number | null
          industry_avg_completion_rate?: number | null
          industry_avg_productivity?: number | null
          industry_avg_profit_margin?: number | null
          industry_avg_safety_incidents?: number | null
          industry_sector?: string | null
          market_position_percentile?: number | null
          period_end?: string
          period_start?: string
          top_performer_budget_variance?: number | null
          top_performer_client_satisfaction?: number | null
          top_performer_completion_rate?: number | null
          top_performer_productivity?: number | null
          top_performer_profit_margin?: number | null
          top_performer_safety_incidents?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      permit_compliance_events: {
        Row: {
          areas_inspected: string[] | null
          assigned_to: string | null
          compliance_rating: string | null
          corrective_action_completion_date: string | null
          corrective_action_deadline: string | null
          corrective_actions_completed: boolean | null
          corrective_actions_required: Json | null
          created_at: string
          event_date: string
          event_type: string
          findings: string | null
          fine_paid_date: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          inspection_report_path: string | null
          inspection_type: string | null
          inspector_agency: string | null
          inspector_name: string | null
          internal_notes: string | null
          penalty_amount: number | null
          permit_id: string
          photos: Json | null
          reported_by: string | null
          resolution_status: string | null
          supporting_documents: Json | null
          updated_at: string
          violations_found: Json | null
        }
        Insert: {
          areas_inspected?: string[] | null
          assigned_to?: string | null
          compliance_rating?: string | null
          corrective_action_completion_date?: string | null
          corrective_action_deadline?: string | null
          corrective_actions_completed?: boolean | null
          corrective_actions_required?: Json | null
          created_at?: string
          event_date: string
          event_type: string
          findings?: string | null
          fine_paid_date?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspection_report_path?: string | null
          inspection_type?: string | null
          inspector_agency?: string | null
          inspector_name?: string | null
          internal_notes?: string | null
          penalty_amount?: number | null
          permit_id: string
          photos?: Json | null
          reported_by?: string | null
          resolution_status?: string | null
          supporting_documents?: Json | null
          updated_at?: string
          violations_found?: Json | null
        }
        Update: {
          areas_inspected?: string[] | null
          assigned_to?: string | null
          compliance_rating?: string | null
          corrective_action_completion_date?: string | null
          corrective_action_deadline?: string | null
          corrective_actions_completed?: boolean | null
          corrective_actions_required?: Json | null
          created_at?: string
          event_date?: string
          event_type?: string
          findings?: string | null
          fine_paid_date?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspection_report_path?: string | null
          inspection_type?: string | null
          inspector_agency?: string | null
          inspector_name?: string | null
          internal_notes?: string | null
          penalty_amount?: number | null
          permit_id?: string
          photos?: Json | null
          reported_by?: string | null
          resolution_status?: string | null
          supporting_documents?: Json | null
          updated_at?: string
          violations_found?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "permit_compliance_events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_compliance_events_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "environmental_permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_compliance_events_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_inspections: {
        Row: {
          corrections_required: string | null
          created_at: string
          created_by: string | null
          id: string
          inspection_date: string
          inspection_document_path: string | null
          inspection_type: string
          inspector_contact: string | null
          inspector_name: string | null
          permit_id: string
          reinspection_date: string | null
          result_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          corrections_required?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_date: string
          inspection_document_path?: string | null
          inspection_type: string
          inspector_contact?: string | null
          inspector_name?: string | null
          permit_id: string
          reinspection_date?: string | null
          result_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          corrections_required?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_date?: string
          inspection_document_path?: string | null
          inspection_type?: string
          inspector_contact?: string | null
          inspector_name?: string | null
          permit_id?: string
          reinspection_date?: string | null
          result_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_inspections_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_renewals: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          new_expiry_date: string
          permit_id: string
          processed_by: string | null
          processed_date: string | null
          renewal_date: string
          renewal_document_path: string | null
          renewal_fee: number | null
          renewal_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_expiry_date: string
          permit_id: string
          processed_by?: string | null
          processed_date?: string | null
          renewal_date: string
          renewal_document_path?: string | null
          renewal_fee?: number | null
          renewal_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_expiry_date?: string
          permit_id?: string
          processed_by?: string | null
          processed_date?: string | null
          renewal_date?: string
          renewal_document_path?: string | null
          renewal_fee?: number | null
          renewal_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_renewals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_renewals_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permits: {
        Row: {
          application_date: string | null
          application_document_path: string | null
          application_fee: number | null
          application_status: string
          approval_date: string | null
          bond_amount: number | null
          bond_required: boolean | null
          company_id: string
          conditions: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          inspection_required: boolean | null
          issuing_authority: string
          notes: string | null
          permit_document_path: string | null
          permit_expiry_date: string | null
          permit_fee: number | null
          permit_name: string
          permit_number: string | null
          permit_start_date: string | null
          permit_type: string
          priority: string | null
          project_id: string
          requirements: string[] | null
          updated_at: string
        }
        Insert: {
          application_date?: string | null
          application_document_path?: string | null
          application_fee?: number | null
          application_status?: string
          approval_date?: string | null
          bond_amount?: number | null
          bond_required?: boolean | null
          company_id: string
          conditions?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inspection_required?: boolean | null
          issuing_authority: string
          notes?: string | null
          permit_document_path?: string | null
          permit_expiry_date?: string | null
          permit_fee?: number | null
          permit_name: string
          permit_number?: string | null
          permit_start_date?: string | null
          permit_type: string
          priority?: string | null
          project_id: string
          requirements?: string[] | null
          updated_at?: string
        }
        Update: {
          application_date?: string | null
          application_document_path?: string | null
          application_fee?: number | null
          application_status?: string
          approval_date?: string | null
          bond_amount?: number | null
          bond_required?: boolean | null
          company_id?: string
          conditions?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inspection_required?: boolean | null
          issuing_authority?: string
          notes?: string | null
          permit_document_path?: string | null
          permit_expiry_date?: string | null
          permit_fee?: number | null
          permit_name?: string
          permit_number?: string | null
          permit_start_date?: string | null
          permit_type?: string
          priority?: string | null
          project_id?: string
          requirements?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_attachments: {
        Row: {
          caption: string | null
          created_at: string
          daily_report_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          gps_coordinates: unknown | null
          id: string
          mime_type: string | null
          project_id: string | null
          taken_at: string | null
          time_entry_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          daily_report_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          gps_coordinates?: unknown | null
          id?: string
          mime_type?: string | null
          project_id?: string | null
          taken_at?: string | null
          time_entry_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          daily_report_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          gps_coordinates?: unknown | null
          id?: string
          mime_type?: string | null
          project_id?: string | null
          taken_at?: string | null
          time_entry_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_attachments_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "photo_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_attachments_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_metrics: {
        Row: {
          average_cycle_time: number | null
          average_deal_size: number | null
          company_id: string
          conversion_rate: number | null
          created_at: string | null
          deals_active: number | null
          deals_created: number | null
          deals_lost: number | null
          deals_won: number | null
          id: string
          lost_value: number | null
          metric_date: string
          period_type: string
          template_id: string | null
          total_pipeline_value: number | null
          weighted_pipeline_value: number | null
          win_rate: number | null
          won_value: number | null
        }
        Insert: {
          average_cycle_time?: number | null
          average_deal_size?: number | null
          company_id: string
          conversion_rate?: number | null
          created_at?: string | null
          deals_active?: number | null
          deals_created?: number | null
          deals_lost?: number | null
          deals_won?: number | null
          id?: string
          lost_value?: number | null
          metric_date: string
          period_type?: string
          template_id?: string | null
          total_pipeline_value?: number | null
          weighted_pipeline_value?: number | null
          win_rate?: number | null
          won_value?: number | null
        }
        Update: {
          average_cycle_time?: number | null
          average_deal_size?: number | null
          company_id?: string
          conversion_rate?: number | null
          created_at?: string | null
          deals_active?: number | null
          deals_created?: number | null
          deals_lost?: number | null
          deals_won?: number | null
          id?: string
          lost_value?: number | null
          metric_date?: string
          period_type?: string
          template_id?: string | null
          total_pipeline_value?: number | null
          weighted_pipeline_value?: number | null
          win_rate?: number | null
          won_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_metrics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          auto_tasks: Json | null
          color_code: string | null
          company_id: string
          conversion_rate: number | null
          created_at: string
          description: string | null
          expected_duration_days: number | null
          id: string
          is_active: boolean
          is_final_stage: boolean | null
          is_lost_stage: boolean | null
          is_won_stage: boolean | null
          name: string
          probability_percent: number
          probability_weight: number | null
          required_fields: Json | null
          stage_order: number
          template_id: string | null
          updated_at: string
        }
        Insert: {
          auto_tasks?: Json | null
          color_code?: string | null
          company_id: string
          conversion_rate?: number | null
          created_at?: string
          description?: string | null
          expected_duration_days?: number | null
          id?: string
          is_active?: boolean
          is_final_stage?: boolean | null
          is_lost_stage?: boolean | null
          is_won_stage?: boolean | null
          name: string
          probability_percent?: number
          probability_weight?: number | null
          required_fields?: Json | null
          stage_order: number
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_tasks?: Json | null
          color_code?: string | null
          company_id?: string
          conversion_rate?: number | null
          created_at?: string
          description?: string | null
          expected_duration_days?: number | null
          id?: string
          is_active?: boolean
          is_final_stage?: boolean | null
          is_lost_stage?: boolean | null
          is_won_stage?: boolean | null
          name?: string
          probability_percent?: number
          probability_weight?: number | null
          required_fields?: Json | null
          stage_order?: number
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_templates: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          deal_type: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          deal_type?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          deal_type?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_costs: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          cost_category: string
          cost_date: string
          cost_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          invoice_number: string | null
          is_recurring: boolean | null
          notes: string | null
          recurrence_interval: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          cost_category: string
          cost_date?: string
          cost_type: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          recurrence_interval?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          cost_category?: string
          cost_date?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          recurrence_interval?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_revenue: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          revenue_type: string
          stripe_payment_id: string | null
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          revenue_type: string
          stripe_payment_id?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          revenue_type?: string
          stripe_payment_id?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_performance: {
        Row: {
          accuracy_rate: number | null
          accurate_predictions: number
          average_confidence: number | null
          average_error_margin: number | null
          company_id: string
          created_at: string
          evaluation_period_end: string
          evaluation_period_start: string
          false_negative_rate: number | null
          false_positive_rate: number | null
          id: string
          model_drift_indicator: number | null
          model_id: string
          recommendations_followed_count: number | null
          recommendations_success_rate: number | null
          total_predictions: number
          updated_at: string
        }
        Insert: {
          accuracy_rate?: number | null
          accurate_predictions?: number
          average_confidence?: number | null
          average_error_margin?: number | null
          company_id: string
          created_at?: string
          evaluation_period_end: string
          evaluation_period_start: string
          false_negative_rate?: number | null
          false_positive_rate?: number | null
          id?: string
          model_drift_indicator?: number | null
          model_id: string
          recommendations_followed_count?: number | null
          recommendations_success_rate?: number | null
          total_predictions?: number
          updated_at?: string
        }
        Update: {
          accuracy_rate?: number | null
          accurate_predictions?: number
          average_confidence?: number | null
          average_error_margin?: number | null
          company_id?: string
          created_at?: string
          evaluation_period_end?: string
          evaluation_period_start?: string
          false_negative_rate?: number | null
          false_positive_rate?: number | null
          id?: string
          model_drift_indicator?: number | null
          model_id?: string
          recommendations_followed_count?: number | null
          recommendations_success_rate?: number | null
          total_predictions?: number
          updated_at?: string
        }
        Relationships: []
      }
      predictive_models: {
        Row: {
          accuracy: number | null
          algorithm: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          f1_score: number | null
          features: Json
          id: string
          is_active: boolean | null
          is_production: boolean | null
          last_retrained: string | null
          model_name: string
          model_type: string
          model_version: string | null
          precision_score: number | null
          recall_score: number | null
          thresholds: Json | null
          training_data_size: number | null
          training_date: string | null
          updated_at: string | null
          weights: Json | null
        }
        Insert: {
          accuracy?: number | null
          algorithm?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          f1_score?: number | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          last_retrained?: string | null
          model_name: string
          model_type: string
          model_version?: string | null
          precision_score?: number | null
          recall_score?: number | null
          thresholds?: Json | null
          training_data_size?: number | null
          training_date?: string | null
          updated_at?: string | null
          weights?: Json | null
        }
        Update: {
          accuracy?: number | null
          algorithm?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          f1_score?: number | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          last_retrained?: string | null
          model_name?: string
          model_type?: string
          model_version?: string | null
          precision_score?: number | null
          recall_score?: number | null
          thresholds?: Json | null
          training_data_size?: number | null
          training_date?: string | null
          updated_at?: string | null
          weights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "predictive_models_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      procurement_opportunities: {
        Row: {
          addenda_urls: string[] | null
          agency_contact_email: string | null
          agency_contact_name: string | null
          agency_contact_phone: string | null
          award_date: string | null
          bond_requirements: Json | null
          certification_requirements: string[] | null
          company_id: string
          contract_duration_months: number | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_value: number | null
          id: string
          insurance_requirements: Json | null
          is_watched: boolean | null
          issuing_agency: string
          license_requirements: string[] | null
          mbe_wbe_requirements: Json | null
          minimum_experience_years: number | null
          notes: string | null
          opportunity_number: string
          pre_bid_meeting_date: string | null
          procurement_type: string
          project_category: string | null
          project_location: string | null
          published_date: string | null
          questions_due_date: string | null
          solicitation_document_url: string | null
          special_requirements: string | null
          status: string
          submission_deadline: string
          submission_portal_url: string | null
          title: string
          updated_at: string
          work_scope: string | null
        }
        Insert: {
          addenda_urls?: string[] | null
          agency_contact_email?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          award_date?: string | null
          bond_requirements?: Json | null
          certification_requirements?: string[] | null
          company_id: string
          contract_duration_months?: number | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          insurance_requirements?: Json | null
          is_watched?: boolean | null
          issuing_agency: string
          license_requirements?: string[] | null
          mbe_wbe_requirements?: Json | null
          minimum_experience_years?: number | null
          notes?: string | null
          opportunity_number: string
          pre_bid_meeting_date?: string | null
          procurement_type: string
          project_category?: string | null
          project_location?: string | null
          published_date?: string | null
          questions_due_date?: string | null
          solicitation_document_url?: string | null
          special_requirements?: string | null
          status?: string
          submission_deadline: string
          submission_portal_url?: string | null
          title: string
          updated_at?: string
          work_scope?: string | null
        }
        Update: {
          addenda_urls?: string[] | null
          agency_contact_email?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          award_date?: string | null
          bond_requirements?: Json | null
          certification_requirements?: string[] | null
          company_id?: string
          contract_duration_months?: number | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          insurance_requirements?: Json | null
          is_watched?: boolean | null
          issuing_agency?: string
          license_requirements?: string[] | null
          mbe_wbe_requirements?: Json | null
          minimum_experience_years?: number | null
          notes?: string | null
          opportunity_number?: string
          pre_bid_meeting_date?: string | null
          procurement_type?: string
          project_category?: string | null
          project_location?: string | null
          published_date?: string | null
          questions_due_date?: string | null
          solicitation_document_url?: string | null
          special_requirements?: string | null
          status?: string
          submission_deadline?: string
          submission_portal_url?: string | null
          title?: string
          updated_at?: string
          work_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_requirements: {
        Row: {
          bid_submission_id: string | null
          compliance_date: string | null
          compliance_notes: string | null
          correction_deadline: string | null
          corrective_action_taken: string | null
          created_at: string
          created_by: string | null
          deficiency_description: string | null
          description: string
          evidence_document_path: string | null
          id: string
          is_met: boolean | null
          is_required: boolean | null
          opportunity_id: string
          requirement_name: string
          requirement_type: string
          status: string | null
          updated_at: string
          verification_date: string | null
          verification_method: string | null
          verified_by: string | null
        }
        Insert: {
          bid_submission_id?: string | null
          compliance_date?: string | null
          compliance_notes?: string | null
          correction_deadline?: string | null
          corrective_action_taken?: string | null
          created_at?: string
          created_by?: string | null
          deficiency_description?: string | null
          description: string
          evidence_document_path?: string | null
          id?: string
          is_met?: boolean | null
          is_required?: boolean | null
          opportunity_id: string
          requirement_name: string
          requirement_type: string
          status?: string | null
          updated_at?: string
          verification_date?: string | null
          verification_method?: string | null
          verified_by?: string | null
        }
        Update: {
          bid_submission_id?: string | null
          compliance_date?: string | null
          compliance_notes?: string | null
          correction_deadline?: string | null
          corrective_action_taken?: string | null
          created_at?: string
          created_by?: string | null
          deficiency_description?: string | null
          description?: string
          evidence_document_path?: string | null
          id?: string
          is_met?: boolean | null
          is_required?: boolean | null
          opportunity_id?: string
          requirement_name?: string
          requirement_type?: string
          status?: string | null
          updated_at?: string
          verification_date?: string | null
          verification_method?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_requirements_bid_submission_id_fkey"
            columns: ["bid_submission_id"]
            isOneToOne: false
            referencedRelation: "bid_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requirements_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "procurement_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string | null
          id: string
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assigned_at: string
          hourly_rate: number | null
          id: string
          project_id: string
          removed_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          hourly_rate?: number | null
          id?: string
          project_id: string
          removed_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          hourly_rate?: number | null
          id?: string
          project_id?: string
          removed_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_bond_requirements: {
        Row: {
          bond_id: string | null
          bond_type: string
          created_at: string
          created_by: string | null
          id: string
          is_required: boolean
          is_satisfied: boolean
          project_id: string
          required_amount: number
          required_percentage: number | null
          requirement_description: string | null
          satisfied_date: string | null
          updated_at: string
        }
        Insert: {
          bond_id?: string | null
          bond_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_required?: boolean
          is_satisfied?: boolean
          project_id: string
          required_amount: number
          required_percentage?: number | null
          requirement_description?: string | null
          satisfied_date?: string | null
          updated_at?: string
        }
        Update: {
          bond_id?: string | null
          bond_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_required?: boolean
          is_satisfied?: boolean
          project_id?: string
          required_amount?: number
          required_percentage?: number | null
          requirement_description?: string | null
          satisfied_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_bond_requirements_bond_id_fkey"
            columns: ["bond_id"]
            isOneToOne: false
            referencedRelation: "bonds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bond_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bond_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_bond_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          budgeted_amount: number
          cost_code_id: string
          created_at: string
          created_by: string | null
          equipment_budget: number | null
          id: string
          labor_budget: number | null
          material_budget: number | null
          notes: string | null
          other_budget: number | null
          project_id: string
          subcontractor_budget: number | null
          updated_at: string
        }
        Insert: {
          budgeted_amount?: number
          cost_code_id: string
          created_at?: string
          created_by?: string | null
          equipment_budget?: number | null
          id?: string
          labor_budget?: number | null
          material_budget?: number | null
          notes?: string | null
          other_budget?: number | null
          project_id: string
          subcontractor_budget?: number | null
          updated_at?: string
        }
        Update: {
          budgeted_amount?: number
          cost_code_id?: string
          created_at?: string
          created_by?: string | null
          equipment_budget?: number | null
          id?: string
          labor_budget?: number | null
          material_budget?: number | null
          notes?: string | null
          other_budget?: number | null
          project_id?: string
          subcontractor_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_communication_participants: {
        Row: {
          can_upload_files: boolean
          created_at: string
          id: string
          last_read_at: string | null
          participant_type: string
          project_id: string
          user_id: string
        }
        Insert: {
          can_upload_files?: boolean
          created_at?: string
          id?: string
          last_read_at?: string | null
          participant_type: string
          project_id: string
          user_id: string
        }
        Update: {
          can_upload_files?: boolean
          created_at?: string
          id?: string
          last_read_at?: string | null
          participant_type?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_communication_participants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_communication_participants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_communication_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contacts: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean | null
          project_id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          project_id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          project_id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_codes: {
        Row: {
          budget_amount: number | null
          category: string
          code: string
          company_id: string
          created_at: string
          description: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number | null
          category: string
          code: string
          company_id: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number | null
          category?: string
          code?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_entries: {
        Row: {
          amount: number
          company_id: string
          cost_code_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          quantity: number | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          cost_code_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type: string
          id?: string
          quantity?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          cost_code_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          quantity?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_entries_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "project_cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_costs: {
        Row: {
          actual_amount: number | null
          budgeted_amount: number | null
          company_id: string
          cost_category: string | null
          cost_code_id: string | null
          cost_date: string
          cost_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          invoice_number: string | null
          notes: string | null
          project_id: string
          quickbooks_item_id: string | null
          quickbooks_sync_status: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          company_id: string
          cost_category?: string | null
          cost_code_id?: string | null
          cost_date?: string
          cost_type: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          project_id: string
          quickbooks_item_id?: string | null
          quickbooks_sync_status?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          company_id?: string
          cost_category?: string | null
          cost_code_id?: string | null
          cost_date?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          project_id?: string
          quickbooks_item_id?: string | null
          quickbooks_sync_status?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_historical_data: {
        Row: {
          actual_duration_days: number | null
          change_orders_count: number | null
          change_orders_value: number | null
          client_satisfaction_score: number | null
          company_id: string
          completion_status: string | null
          complexity_score: number | null
          cost_overrun_reasons: Json | null
          created_at: string
          delay_reasons: Json | null
          final_cost: number | null
          id: string
          labor_cost_variance_percentage: number | null
          lessons_learned: Json | null
          material_cost_variance_percentage: number | null
          original_budget: number | null
          original_duration_days: number | null
          project_end_date: string | null
          project_id: string | null
          project_name: string | null
          project_start_date: string | null
          project_type: string | null
          resource_utilization_rate: number | null
          seasonal_factors: Json | null
          success_factors: Json | null
          team_size: number | null
          updated_at: string
          weather_delays_days: number | null
        }
        Insert: {
          actual_duration_days?: number | null
          change_orders_count?: number | null
          change_orders_value?: number | null
          client_satisfaction_score?: number | null
          company_id: string
          completion_status?: string | null
          complexity_score?: number | null
          cost_overrun_reasons?: Json | null
          created_at?: string
          delay_reasons?: Json | null
          final_cost?: number | null
          id?: string
          labor_cost_variance_percentage?: number | null
          lessons_learned?: Json | null
          material_cost_variance_percentage?: number | null
          original_budget?: number | null
          original_duration_days?: number | null
          project_end_date?: string | null
          project_id?: string | null
          project_name?: string | null
          project_start_date?: string | null
          project_type?: string | null
          resource_utilization_rate?: number | null
          seasonal_factors?: Json | null
          success_factors?: Json | null
          team_size?: number | null
          updated_at?: string
          weather_delays_days?: number | null
        }
        Update: {
          actual_duration_days?: number | null
          change_orders_count?: number | null
          change_orders_value?: number | null
          client_satisfaction_score?: number | null
          company_id?: string
          completion_status?: string | null
          complexity_score?: number | null
          cost_overrun_reasons?: Json | null
          created_at?: string
          delay_reasons?: Json | null
          final_cost?: number | null
          id?: string
          labor_cost_variance_percentage?: number | null
          lessons_learned?: Json | null
          material_cost_variance_percentage?: number | null
          original_budget?: number | null
          original_duration_days?: number | null
          project_end_date?: string | null
          project_id?: string | null
          project_name?: string | null
          project_start_date?: string | null
          project_type?: string | null
          resource_utilization_rate?: number | null
          seasonal_factors?: Json | null
          success_factors?: Json | null
          team_size?: number | null
          updated_at?: string
          weather_delays_days?: number | null
        }
        Relationships: []
      }
      project_insurance_requirements: {
        Row: {
          additional_insured_required: boolean | null
          certificate_expiry_date: string | null
          certificate_holder: string | null
          certificate_received: boolean | null
          created_at: string
          created_by: string | null
          id: string
          insurance_policy_id: string | null
          insurance_type: string
          is_required: boolean
          is_satisfied: boolean
          maximum_deductible: number | null
          minimum_aggregate: number | null
          minimum_coverage: number
          primary_non_contributory_required: boolean | null
          project_id: string
          requirement_description: string | null
          satisfied_date: string | null
          updated_at: string
          waiver_of_subrogation_required: boolean | null
        }
        Insert: {
          additional_insured_required?: boolean | null
          certificate_expiry_date?: string | null
          certificate_holder?: string | null
          certificate_received?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          insurance_policy_id?: string | null
          insurance_type: string
          is_required?: boolean
          is_satisfied?: boolean
          maximum_deductible?: number | null
          minimum_aggregate?: number | null
          minimum_coverage: number
          primary_non_contributory_required?: boolean | null
          project_id: string
          requirement_description?: string | null
          satisfied_date?: string | null
          updated_at?: string
          waiver_of_subrogation_required?: boolean | null
        }
        Update: {
          additional_insured_required?: boolean | null
          certificate_expiry_date?: string | null
          certificate_holder?: string | null
          certificate_received?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          insurance_policy_id?: string | null
          insurance_type?: string
          is_required?: boolean
          is_satisfied?: boolean
          maximum_deductible?: number | null
          minimum_aggregate?: number | null
          minimum_coverage?: number
          primary_non_contributory_required?: boolean | null
          project_id?: string
          requirement_description?: string | null
          satisfied_date?: string | null
          updated_at?: string
          waiver_of_subrogation_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_insurance_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_insurance_requirements_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_insurance_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_insurance_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_read: boolean
          message_text: string | null
          message_type: string
          project_id: string
          sender_id: string
          sender_type: string
          updated_at: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string | null
          message_type?: string
          project_id: string
          sender_id: string
          sender_type: string
          updated_at?: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string | null
          message_type?: string
          project_id?: string
          sender_id?: string
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          actual_date: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_critical: boolean | null
          milestone_type: string | null
          name: string
          project_id: string
          status: string | null
          target_date: string
          updated_at: string | null
        }
        Insert: {
          actual_date?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean | null
          milestone_type?: string | null
          name: string
          project_id: string
          status?: string | null
          target_date: string
          updated_at?: string | null
        }
        Update: {
          actual_date?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean | null
          milestone_type?: string | null
          name?: string
          project_id?: string
          status?: string | null
          target_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_predictions: {
        Row: {
          actual_outcome: number | null
          baseline_value: number | null
          company_id: string
          confidence_score: number
          contributing_factors: Json | null
          created_at: string
          id: string
          is_validated: boolean | null
          metadata: Json | null
          model_id: string
          predicted_unit: string
          predicted_value: number
          prediction_accuracy: number | null
          prediction_date: string
          prediction_type: string
          project_id: string | null
          recommendations: Json | null
          risk_level: string
          target_date: string | null
          validation_date: string | null
          variance_from_baseline: number | null
        }
        Insert: {
          actual_outcome?: number | null
          baseline_value?: number | null
          company_id: string
          confidence_score: number
          contributing_factors?: Json | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          metadata?: Json | null
          model_id: string
          predicted_unit: string
          predicted_value: number
          prediction_accuracy?: number | null
          prediction_date?: string
          prediction_type: string
          project_id?: string | null
          recommendations?: Json | null
          risk_level: string
          target_date?: string | null
          validation_date?: string | null
          variance_from_baseline?: number | null
        }
        Update: {
          actual_outcome?: number | null
          baseline_value?: number | null
          company_id?: string
          confidence_score?: number
          contributing_factors?: Json | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          metadata?: Json | null
          model_id?: string
          predicted_unit?: string
          predicted_value?: number
          prediction_accuracy?: number | null
          prediction_date?: string
          prediction_type?: string
          project_id?: string | null
          recommendations?: Json | null
          risk_level?: string
          target_date?: string | null
          validation_date?: string | null
          variance_from_baseline?: number | null
        }
        Relationships: []
      }
      project_revenue: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          invoice_date: string | null
          notes: string | null
          payment_date: string | null
          project_id: string
          quickbooks_invoice_id: string | null
          quickbooks_sync_status: string | null
          revenue_type: string
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          invoice_date?: string | null
          notes?: string | null
          payment_date?: string | null
          project_id: string
          quickbooks_invoice_id?: string | null
          quickbooks_sync_status?: string | null
          revenue_type?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          invoice_date?: string | null
          notes?: string | null
          payment_date?: string | null
          project_id?: string
          quickbooks_invoice_id?: string | null
          quickbooks_sync_status?: string | null
          revenue_type?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_revenue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_revenue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_revenue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_revenue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_updates: {
        Row: {
          attachments: Json | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          images: Json | null
          is_published: boolean | null
          project_id: string
          published_at: string | null
          status_type: string
          title: string
          updated_at: string
          visibility: string | null
        }
        Insert: {
          attachments?: Json | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_published?: boolean | null
          project_id: string
          published_at?: string | null
          status_type: string
          title: string
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          attachments?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_published?: boolean | null
          project_id?: string
          published_at?: string | null
          status_type?: string
          title?: string
          updated_at?: string
          visibility?: string | null
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          industry_type: string | null
          name: string
          project_type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          industry_type?: string | null
          name: string
          project_type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          industry_type?: string | null
          name?: string
          project_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          geofence_radius_meters: number | null
          id: string
          name: string
          permit_numbers: string[] | null
          profit_margin: number | null
          project_manager_id: string | null
          project_type: string | null
          site_address: string | null
          site_latitude: number | null
          site_longitude: number | null
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
          geofence_radius_meters?: number | null
          id?: string
          name: string
          permit_numbers?: string[] | null
          profit_margin?: number | null
          project_manager_id?: string | null
          project_type?: string | null
          site_address?: string | null
          site_latitude?: number | null
          site_longitude?: number | null
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
          geofence_radius_meters?: number | null
          id?: string
          name?: string
          permit_numbers?: string[] | null
          profit_margin?: number | null
          project_manager_id?: string | null
          project_type?: string | null
          site_address?: string | null
          site_latitude?: number | null
          site_longitude?: number | null
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
      promotions: {
        Row: {
          applies_to: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_percentage: number
          display_on: string[] | null
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          applies_to?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage: number
          display_on?: string[] | null
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          applies_to?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number
          display_on?: string[] | null
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      punch_list_items: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          date_completed: string | null
          date_identified: string | null
          description: string
          due_date: string | null
          id: string
          item_number: string
          location: string | null
          priority: string | null
          project_id: string | null
          status: string | null
          trade: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          date_completed?: string | null
          date_identified?: string | null
          description: string
          due_date?: string | null
          id?: string
          item_number: string
          location?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          trade?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          date_completed?: string | null
          date_identified?: string | null
          description?: string
          due_date?: string | null
          id?: string
          item_number?: string
          location?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_list_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_line_items: {
        Row: {
          cost_code_id: string | null
          created_at: string
          description: string
          id: string
          line_number: number
          notes: string | null
          purchase_order_id: string
          quantity: number
          total_price: number | null
          unit_of_measure: string | null
          unit_price: number
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string
          description: string
          id?: string
          line_number: number
          notes?: string | null
          purchase_order_id: string
          quantity: number
          total_price?: number | null
          unit_of_measure?: string | null
          unit_price: number
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string
          description?: string
          id?: string
          line_number?: number
          notes?: string | null
          purchase_order_id?: string
          quantity?: number
          total_price?: number | null
          unit_of_measure?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_line_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          delivery_address: string | null
          delivery_date: string | null
          id: string
          notes: string | null
          po_date: string
          po_number: string
          project_id: string | null
          received_at: string | null
          sent_at: string | null
          shipping_cost: number | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          terms: string | null
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          po_date?: string
          po_number: string
          project_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          po_date?: string
          po_number?: string
          project_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspections: {
        Row: {
          checklist_items: Json | null
          company_id: string
          created_at: string
          deficiencies: Json | null
          id: string
          inspection_date: string
          inspection_number: string
          inspection_type: string
          inspector_id: string | null
          location: string | null
          notes: string | null
          passed: boolean | null
          phase: string | null
          photos: Json | null
          project_id: string
          reinspection_date: string | null
          reinspection_required: boolean | null
          status: string | null
          updated_at: string
        }
        Insert: {
          checklist_items?: Json | null
          company_id: string
          created_at?: string
          deficiencies?: Json | null
          id?: string
          inspection_date: string
          inspection_number: string
          inspection_type: string
          inspector_id?: string | null
          location?: string | null
          notes?: string | null
          passed?: boolean | null
          phase?: string | null
          photos?: Json | null
          project_id: string
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          checklist_items?: Json | null
          company_id?: string
          created_at?: string
          deficiencies?: Json | null
          id?: string
          inspection_date?: string
          inspection_number?: string
          inspection_type?: string
          inspector_id?: string | null
          location?: string | null
          notes?: string | null
          passed?: boolean | null
          phase?: string | null
          photos?: Json | null
          project_id?: string
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_customers: {
        Row: {
          address: Json | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          last_synced_at: string | null
          name: string
          phone: string | null
          qb_customer_id: string
          qb_sync_token: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          phone?: string | null
          qb_customer_id: string
          qb_sync_token?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          phone?: string | null
          qb_customer_id?: string
          qb_sync_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_integrations: {
        Row: {
          access_token: string | null
          company_id: string
          connection_status: string | null
          created_at: string
          id: string
          is_connected: boolean
          last_error_message: string | null
          last_sync_at: string | null
          last_sync_status: string | null
          oauth_state: string | null
          qb_company_id: string | null
          qb_company_name: string | null
          refresh_token: string | null
          sandbox_mode: boolean | null
          sync_settings: Json | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          company_id: string
          connection_status?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_error_message?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          oauth_state?: string | null
          qb_company_id?: string | null
          qb_company_name?: string | null
          refresh_token?: string | null
          sandbox_mode?: boolean | null
          sync_settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          company_id?: string
          connection_status?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_error_message?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          oauth_state?: string | null
          qb_company_id?: string | null
          qb_company_name?: string | null
          refresh_token?: string | null
          sandbox_mode?: boolean | null
          sync_settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_items: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          last_synced_at: string | null
          name: string
          qb_item_id: string
          qb_sync_token: string | null
          type: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          qb_item_id: string
          qb_sync_token?: string | null
          type?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          qb_item_id?: string
          qb_sync_token?: string | null
          type?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_sync_logs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          error_details: Json | null
          errors_count: number | null
          id: string
          records_processed: Json | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_details?: Json | null
          errors_count?: number | null
          id?: string
          records_processed?: Json | null
          started_at: string
          status?: string
          sync_type: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_details?: Json | null
          errors_count?: number | null
          id?: string
          records_processed?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_sync_logs_company_id_fkey"
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
      resource_availability_patterns: {
        Row: {
          company_id: string
          confidence_score: number | null
          created_at: string
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          pattern_data: Json
          pattern_type: string
          resource_id: string
          resource_type: string
          updated_at: string
          usage_frequency: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          pattern_data?: Json
          pattern_type: string
          resource_id: string
          resource_type: string
          updated_at?: string
          usage_frequency?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          pattern_data?: Json
          pattern_type?: string
          resource_id?: string
          resource_type?: string
          updated_at?: string
          usage_frequency?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      resource_conflicts: {
        Row: {
          ai_recommendation: string | null
          auto_resolvable: boolean | null
          business_impact_score: number | null
          capacity_available: number | null
          capacity_required: number | null
          company_id: string
          conflict_end_datetime: string
          conflict_start_datetime: string
          conflict_type: string
          created_at: string
          detected_at: string
          escalation_reason: string | null
          human_review_required: boolean | null
          id: string
          optimization_run_id: string | null
          overlap_duration_minutes: number | null
          primary_project_id: string
          primary_task_id: string | null
          priority_score: number | null
          resolution_applied: boolean | null
          resolution_details: Json | null
          resolution_strategy: string | null
          resolved_at: string | null
          resolved_by: string | null
          resource_id: string
          resource_type: string
          secondary_project_id: string | null
          secondary_task_id: string | null
          severity: string
          skill_available: string | null
          skill_required: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_recommendation?: string | null
          auto_resolvable?: boolean | null
          business_impact_score?: number | null
          capacity_available?: number | null
          capacity_required?: number | null
          company_id: string
          conflict_end_datetime: string
          conflict_start_datetime: string
          conflict_type: string
          created_at?: string
          detected_at?: string
          escalation_reason?: string | null
          human_review_required?: boolean | null
          id?: string
          optimization_run_id?: string | null
          overlap_duration_minutes?: number | null
          primary_project_id: string
          primary_task_id?: string | null
          priority_score?: number | null
          resolution_applied?: boolean | null
          resolution_details?: Json | null
          resolution_strategy?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id: string
          resource_type: string
          secondary_project_id?: string | null
          secondary_task_id?: string | null
          severity?: string
          skill_available?: string | null
          skill_required?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_recommendation?: string | null
          auto_resolvable?: boolean | null
          business_impact_score?: number | null
          capacity_available?: number | null
          capacity_required?: number | null
          company_id?: string
          conflict_end_datetime?: string
          conflict_start_datetime?: string
          conflict_type?: string
          created_at?: string
          detected_at?: string
          escalation_reason?: string | null
          human_review_required?: boolean | null
          id?: string
          optimization_run_id?: string | null
          overlap_duration_minutes?: number | null
          primary_project_id?: string
          primary_task_id?: string | null
          priority_score?: number | null
          resolution_applied?: boolean | null
          resolution_details?: Json | null
          resolution_strategy?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string
          resource_type?: string
          secondary_project_id?: string | null
          secondary_task_id?: string | null
          severity?: string
          skill_available?: string | null
          skill_required?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_conflicts_optimization_run_id_fkey"
            columns: ["optimization_run_id"]
            isOneToOne: false
            referencedRelation: "resource_optimization_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_optimization_configs: {
        Row: {
          allow_overtime: boolean | null
          auto_reschedule: boolean | null
          availability_weight: number | null
          company_id: string
          cost_weight: number | null
          created_at: string
          id: string
          max_crew_utilization: number | null
          max_equipment_utilization: number | null
          max_overtime_hours: number | null
          notification_enabled: boolean | null
          optimization_strategy: string
          prefer_dedicated_crews: boolean | null
          priority_weight: number | null
          skill_matching_weight: number | null
          travel_time_factor: number | null
          updated_at: string
          weather_consideration: boolean | null
        }
        Insert: {
          allow_overtime?: boolean | null
          auto_reschedule?: boolean | null
          availability_weight?: number | null
          company_id: string
          cost_weight?: number | null
          created_at?: string
          id?: string
          max_crew_utilization?: number | null
          max_equipment_utilization?: number | null
          max_overtime_hours?: number | null
          notification_enabled?: boolean | null
          optimization_strategy?: string
          prefer_dedicated_crews?: boolean | null
          priority_weight?: number | null
          skill_matching_weight?: number | null
          travel_time_factor?: number | null
          updated_at?: string
          weather_consideration?: boolean | null
        }
        Update: {
          allow_overtime?: boolean | null
          auto_reschedule?: boolean | null
          availability_weight?: number | null
          company_id?: string
          cost_weight?: number | null
          created_at?: string
          id?: string
          max_crew_utilization?: number | null
          max_equipment_utilization?: number | null
          max_overtime_hours?: number | null
          notification_enabled?: boolean | null
          optimization_strategy?: string
          prefer_dedicated_crews?: boolean | null
          priority_weight?: number | null
          skill_matching_weight?: number | null
          travel_time_factor?: number | null
          updated_at?: string
          weather_consideration?: boolean | null
        }
        Relationships: []
      }
      resource_optimization_metrics: {
        Row: {
          ai_confidence_average: number | null
          company_id: string
          conflicts_resolved: number | null
          cost_after: number | null
          cost_before: number | null
          cost_savings: number | null
          created_at: string
          crew_utilization_average: number | null
          efficiency_after_percentage: number | null
          efficiency_before_percentage: number | null
          efficiency_improvement: number | null
          equipment_utilization_average: number | null
          id: string
          metric_date: string
          optimization_run_id: string
          overtime_hours_reduced: number | null
          processing_time_seconds: number | null
          projects_impacted: number | null
          tasks_rescheduled: number | null
          total_hours_optimized: number | null
          total_hours_scheduled: number | null
          total_resources: number | null
          travel_time_reduced_minutes: number | null
          user_satisfaction_score: number | null
        }
        Insert: {
          ai_confidence_average?: number | null
          company_id: string
          conflicts_resolved?: number | null
          cost_after?: number | null
          cost_before?: number | null
          cost_savings?: number | null
          created_at?: string
          crew_utilization_average?: number | null
          efficiency_after_percentage?: number | null
          efficiency_before_percentage?: number | null
          efficiency_improvement?: number | null
          equipment_utilization_average?: number | null
          id?: string
          metric_date?: string
          optimization_run_id: string
          overtime_hours_reduced?: number | null
          processing_time_seconds?: number | null
          projects_impacted?: number | null
          tasks_rescheduled?: number | null
          total_hours_optimized?: number | null
          total_hours_scheduled?: number | null
          total_resources?: number | null
          travel_time_reduced_minutes?: number | null
          user_satisfaction_score?: number | null
        }
        Update: {
          ai_confidence_average?: number | null
          company_id?: string
          conflicts_resolved?: number | null
          cost_after?: number | null
          cost_before?: number | null
          cost_savings?: number | null
          created_at?: string
          crew_utilization_average?: number | null
          efficiency_after_percentage?: number | null
          efficiency_before_percentage?: number | null
          efficiency_improvement?: number | null
          equipment_utilization_average?: number | null
          id?: string
          metric_date?: string
          optimization_run_id?: string
          overtime_hours_reduced?: number | null
          processing_time_seconds?: number | null
          projects_impacted?: number | null
          tasks_rescheduled?: number | null
          total_hours_optimized?: number | null
          total_hours_scheduled?: number | null
          total_resources?: number | null
          travel_time_reduced_minutes?: number | null
          user_satisfaction_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_optimization_metrics_optimization_run_id_fkey"
            columns: ["optimization_run_id"]
            isOneToOne: false
            referencedRelation: "resource_optimization_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_optimization_runs: {
        Row: {
          ai_model_used: string | null
          company_id: string
          completed_at: string | null
          config_id: string | null
          conflicts_detected: number | null
          conflicts_resolved: number | null
          cost_savings_estimated: number | null
          created_at: string
          created_by: string | null
          date_range_end: string
          date_range_start: string
          efficiency_improvement_percentage: number | null
          error_message: string | null
          id: string
          optimization_data: Json | null
          optimization_scope: string
          processing_time_seconds: number | null
          recommendations: Json | null
          run_type: string
          scope_id: string | null
          started_at: string
          status: string
          total_resources_analyzed: number | null
        }
        Insert: {
          ai_model_used?: string | null
          company_id: string
          completed_at?: string | null
          config_id?: string | null
          conflicts_detected?: number | null
          conflicts_resolved?: number | null
          cost_savings_estimated?: number | null
          created_at?: string
          created_by?: string | null
          date_range_end: string
          date_range_start: string
          efficiency_improvement_percentage?: number | null
          error_message?: string | null
          id?: string
          optimization_data?: Json | null
          optimization_scope?: string
          processing_time_seconds?: number | null
          recommendations?: Json | null
          run_type?: string
          scope_id?: string | null
          started_at?: string
          status?: string
          total_resources_analyzed?: number | null
        }
        Update: {
          ai_model_used?: string | null
          company_id?: string
          completed_at?: string | null
          config_id?: string | null
          conflicts_detected?: number | null
          conflicts_resolved?: number | null
          cost_savings_estimated?: number | null
          created_at?: string
          created_by?: string | null
          date_range_end?: string
          date_range_start?: string
          efficiency_improvement_percentage?: number | null
          error_message?: string | null
          id?: string
          optimization_data?: Json | null
          optimization_scope?: string
          processing_time_seconds?: number | null
          recommendations?: Json | null
          run_type?: string
          scope_id?: string | null
          started_at?: string
          status?: string
          total_resources_analyzed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_optimization_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "resource_optimization_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_responses: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_final_response: boolean
          responded_by: string
          response_date: string
          response_text: string
          rfi_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_final_response?: boolean
          responded_by: string
          response_date?: string
          response_text: string
          rfi_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_final_response?: boolean
          responded_by?: string
          response_date?: string
          response_text?: string
          rfi_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_responses_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_responses_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string | null
          response_date: string | null
          rfi_number: string
          status: string | null
          subject: string
          submitted_to: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          response_date?: string | null
          rfi_number: string
          status?: string | null
          subject: string
          submitted_to?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          response_date?: string | null
          rfi_number?: string
          status?: string | null
          subject?: string
          submitted_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
      sales_quotas: {
        Row: {
          calls_target: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          deal_types: string[] | null
          deals_target: number | null
          end_date: string
          id: string
          is_active: boolean | null
          meetings_target: number | null
          quota_period: string
          revenue_target: number
          start_date: string
          territory: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calls_target?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          deal_types?: string[] | null
          deals_target?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          meetings_target?: number | null
          quota_period?: string
          revenue_target?: number
          start_date: string
          territory?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calls_target?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          deal_types?: string[] | null
          deals_target?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          meetings_target?: number | null
          quota_period?: string
          revenue_target?: number
          start_date?: string
          territory?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_quotas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scaling_assessments: {
        Row: {
          assessment_data: Json
          assessment_type: string
          company_id: string
          completed_at: string | null
          created_at: string
          current_score: number
          due_date: string | null
          id: string
          priority_level: string
          recommendations: Json
          status: string
          target_score: number
          updated_at: string
        }
        Insert: {
          assessment_data?: Json
          assessment_type: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          current_score: number
          due_date?: string | null
          id?: string
          priority_level?: string
          recommendations?: Json
          status?: string
          target_score: number
          updated_at?: string
        }
        Update: {
          assessment_data?: Json
          assessment_type?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          current_score?: number
          due_date?: string | null
          id?: string
          priority_level?: string
          recommendations?: Json
          status?: string
          target_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      scaling_guidance: {
        Row: {
          applicable_company_size: string
          common_pitfalls: Json | null
          created_at: string
          description: string
          detailed_guidance: string
          estimated_timeframe: string | null
          expected_roi: string | null
          guidance_category: string
          id: string
          implementation_difficulty: string
          industry_focus: string[] | null
          investment_required: string | null
          is_active: boolean
          prerequisites: Json | null
          priority_score: number | null
          related_guidance_ids: string[] | null
          step_by_step_guide: Json | null
          success_indicators: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          applicable_company_size: string
          common_pitfalls?: Json | null
          created_at?: string
          description: string
          detailed_guidance: string
          estimated_timeframe?: string | null
          expected_roi?: string | null
          guidance_category: string
          id?: string
          implementation_difficulty?: string
          industry_focus?: string[] | null
          investment_required?: string | null
          is_active?: boolean
          prerequisites?: Json | null
          priority_score?: number | null
          related_guidance_ids?: string[] | null
          step_by_step_guide?: Json | null
          success_indicators?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          applicable_company_size?: string
          common_pitfalls?: Json | null
          created_at?: string
          description?: string
          detailed_guidance?: string
          estimated_timeframe?: string | null
          expected_roi?: string | null
          guidance_category?: string
          id?: string
          implementation_difficulty?: string
          industry_focus?: string[] | null
          investment_required?: string | null
          is_active?: boolean
          prerequisites?: Json | null
          priority_score?: number | null
          related_guidance_ids?: string[] | null
          step_by_step_guide?: Json | null
          success_indicators?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      scaling_milestones: {
        Row: {
          achievement_date: string | null
          company_id: string
          created_at: string
          current_value: number | null
          description: string | null
          difficulty_level: string
          id: string
          is_achieved: boolean
          milestone_category: string
          milestone_name: string
          prerequisites: Json | null
          success_metrics: Json | null
          target_date: string | null
          target_value: number | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          achievement_date?: string | null
          company_id: string
          created_at?: string
          current_value?: number | null
          description?: string | null
          difficulty_level?: string
          id?: string
          is_achieved?: boolean
          milestone_category: string
          milestone_name: string
          prerequisites?: Json | null
          success_metrics?: Json | null
          target_date?: string | null
          target_value?: number | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          achievement_date?: string | null
          company_id?: string
          created_at?: string
          current_value?: number | null
          description?: string | null
          difficulty_level?: string
          id?: string
          is_achieved?: boolean
          milestone_category?: string
          milestone_name?: string
          prerequisites?: Json | null
          success_metrics?: Json | null
          target_date?: string | null
          target_value?: number | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      scaling_plans: {
        Row: {
          action_items: Json
          actual_completion_date: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_stage: string
          description: string | null
          expected_revenue_increase: number | null
          id: string
          key_objectives: Json
          plan_name: string
          plan_status: string
          risk_factors: Json | null
          start_date: string | null
          success_metrics: Json | null
          target_completion_date: string | null
          target_stage: string
          timeline_months: number
          total_investment_budget: number | null
          updated_at: string
        }
        Insert: {
          action_items?: Json
          actual_completion_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_stage: string
          description?: string | null
          expected_revenue_increase?: number | null
          id?: string
          key_objectives?: Json
          plan_name: string
          plan_status?: string
          risk_factors?: Json | null
          start_date?: string | null
          success_metrics?: Json | null
          target_completion_date?: string | null
          target_stage: string
          timeline_months: number
          total_investment_budget?: number | null
          updated_at?: string
        }
        Update: {
          action_items?: Json
          actual_completion_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_stage?: string
          description?: string | null
          expected_revenue_increase?: number | null
          id?: string
          key_objectives?: Json
          plan_name?: string
          plan_status?: string
          risk_factors?: Json | null
          start_date?: string | null
          success_metrics?: Json | null
          target_completion_date?: string | null
          target_stage?: string
          timeline_months?: number
          total_investment_budget?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      scaling_progress: {
        Row: {
          baseline_value: number
          company_id: string
          created_at: string
          current_value: number
          data_source: string | null
          id: string
          measurement_date: string
          measurement_unit: string
          metric_name: string
          metric_type: string
          notes: string | null
          progress_percentage: number | null
          scaling_plan_id: string | null
          target_value: number
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          baseline_value: number
          company_id: string
          created_at?: string
          current_value: number
          data_source?: string | null
          id?: string
          measurement_date?: string
          measurement_unit: string
          metric_name: string
          metric_type: string
          notes?: string | null
          progress_percentage?: number | null
          scaling_plan_id?: string | null
          target_value: number
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          baseline_value?: number
          company_id?: string
          created_at?: string
          current_value?: number
          data_source?: string | null
          id?: string
          measurement_date?: string
          measurement_unit?: string
          metric_name?: string
          metric_type?: string
          notes?: string | null
          progress_percentage?: number | null
          scaling_plan_id?: string | null
          target_value?: number
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scaling_progress_scaling_plan_id_fkey"
            columns: ["scaling_plan_id"]
            isOneToOne: false
            referencedRelation: "scaling_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_resources: Json | null
          alert_type: string
          company_id: string
          created_at: string
          description: string | null
          event_data: Json | null
          false_positive_reason: string | null
          id: string
          impact_assessment: string | null
          remediation_steps: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          severity: string
          status: string
          title: string
          triggered_at: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_resources?: Json | null
          alert_type: string
          company_id: string
          created_at?: string
          description?: string | null
          event_data?: Json | null
          false_positive_reason?: string | null
          id?: string
          impact_assessment?: string | null
          remediation_steps?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity: string
          status?: string
          title: string
          triggered_at?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_resources?: Json | null
          alert_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          event_data?: Json | null
          false_positive_reason?: string | null
          id?: string
          impact_assessment?: string | null
          remediation_steps?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string
          title?: string
          triggered_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          ip_address: unknown | null
          location: string | null
          metadata: Json | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          location?: string | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          location?: string | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_incidents: {
        Row: {
          acknowledged_at: string | null
          assigned_to: string | null
          company_id: string
          created_at: string
          description: string | null
          detected_at: string | null
          evidence: Json | null
          id: string
          impact_assessment: Json | null
          incident_number: string
          incident_type: string
          lessons_learned: string | null
          reported_at: string | null
          reported_by: string | null
          resolution_summary: string | null
          resolved_at: string | null
          severity: string
          source: string | null
          status: string
          timeline: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_to?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          detected_at?: string | null
          evidence?: Json | null
          id?: string
          impact_assessment?: Json | null
          incident_number: string
          incident_type: string
          lessons_learned?: string | null
          reported_at?: string | null
          reported_by?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity: string
          source?: string | null
          status?: string
          timeline?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          detected_at?: string | null
          evidence?: Json | null
          id?: string
          impact_assessment?: Json | null
          incident_number?: string
          incident_type?: string
          lessons_learned?: string | null
          reported_at?: string | null
          reported_by?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string | null
          status?: string
          timeline?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      security_metrics: {
        Row: {
          company_id: string
          created_at: string
          id: string
          measured_at: string
          measurement_period: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_unit: string | null
          metric_value: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          measured_at?: string
          measurement_period?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_unit?: string | null
          metric_value: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          measured_at?: string
          measurement_period?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_unit?: string | null
          metric_value?: number
        }
        Relationships: []
      }
      security_monitoring_rules: {
        Row: {
          alert_method: string[] | null
          auto_respond: boolean | null
          company_id: string
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          recipients: string[] | null
          response_actions: Json | null
          rule_name: string
          rule_type: string
          severity: string
          threshold_period_minutes: number | null
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          alert_method?: string[] | null
          auto_respond?: boolean | null
          company_id: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          recipients?: string[] | null
          response_actions?: Json | null
          rule_name: string
          rule_type: string
          severity?: string
          threshold_period_minutes?: number | null
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          alert_method?: string[] | null
          auto_respond?: boolean | null
          company_id?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          recipients?: string[] | null
          response_actions?: Json | null
          rule_name?: string
          rule_type?: string
          severity?: string
          threshold_period_minutes?: number | null
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      security_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          operation_type: string
          request_count: number | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          operation_type: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          operation_type?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      seo_ai_insights: {
        Row: {
          action_plan: Json | null
          analysis_date: string
          competitor_analysis: Json | null
          created_at: string
          generated_by: string | null
          id: string
          insights: Json
          recommendations: Json
          traffic_analysis: Json | null
          updated_at: string
        }
        Insert: {
          action_plan?: Json | null
          analysis_date: string
          competitor_analysis?: Json | null
          created_at?: string
          generated_by?: string | null
          id?: string
          insights: Json
          recommendations: Json
          traffic_analysis?: Json | null
          updated_at?: string
        }
        Update: {
          action_plan?: Json | null
          analysis_date?: string
          competitor_analysis?: Json | null
          created_at?: string
          generated_by?: string | null
          id?: string
          insights?: Json
          recommendations?: Json
          traffic_analysis?: Json | null
          updated_at?: string
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
      seo_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          provider: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          provider: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
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
      service_call_parts: {
        Row: {
          added_at: string
          added_by: string | null
          customer_cost: number | null
          description: string | null
          id: string
          inventory_item_id: string | null
          is_warranty_covered: boolean | null
          manufacturer: string | null
          markup_percentage: number | null
          part_name: string
          part_number: string | null
          quantity_used: number
          service_call_id: string
          supplier: string | null
          total_cost: number | null
          unit_cost: number | null
          warranty_period_months: number | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          customer_cost?: number | null
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          is_warranty_covered?: boolean | null
          manufacturer?: string | null
          markup_percentage?: number | null
          part_name: string
          part_number?: string | null
          quantity_used: number
          service_call_id: string
          supplier?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          warranty_period_months?: number | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          customer_cost?: number | null
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          is_warranty_covered?: boolean | null
          manufacturer?: string | null
          markup_percentage?: number | null
          part_name?: string
          part_number?: string | null
          quantity_used?: number
          service_call_id?: string
          supplier?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          warranty_period_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_call_parts_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_call_parts_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          reason: string | null
          service_call_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          reason?: string | null
          service_call_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          reason?: string | null
          service_call_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_call_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_call_status_history_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_templates: {
        Row: {
          company_id: string
          completion_checklist: Json | null
          created_at: string
          created_by: string | null
          default_priority: string | null
          description_template: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean | null
          on_site_checklist: Json | null
          parts_commonly_needed: Json | null
          pre_visit_checklist: Json | null
          safety_requirements: string | null
          service_type: string
          special_instructions: string | null
          template_name: string
          tools_required: string[] | null
          trade_required: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          completion_checklist?: Json | null
          created_at?: string
          created_by?: string | null
          default_priority?: string | null
          description_template?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          on_site_checklist?: Json | null
          parts_commonly_needed?: Json | null
          pre_visit_checklist?: Json | null
          safety_requirements?: string | null
          service_type: string
          special_instructions?: string | null
          template_name: string
          tools_required?: string[] | null
          trade_required?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          completion_checklist?: Json | null
          created_at?: string
          created_by?: string | null
          default_priority?: string | null
          description_template?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          on_site_checklist?: Json | null
          parts_commonly_needed?: Json | null
          pre_visit_checklist?: Json | null
          safety_requirements?: string | null
          service_type?: string
          special_instructions?: string | null
          template_name?: string
          tools_required?: string[] | null
          trade_required?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_call_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_call_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_calls: {
        Row: {
          access_instructions: string | null
          actual_cost: number | null
          after_photos: Json | null
          arrival_notification_sent: boolean | null
          arrived_at: string | null
          assigned_technician_id: string | null
          backup_technician_id: string | null
          before_photos: Json | null
          call_number: string
          company_id: string
          completion_notification_sent: boolean | null
          completion_status: string | null
          created_at: string
          created_by: string | null
          customer_address: string
          customer_company: string | null
          customer_contact_person: string | null
          customer_email: string | null
          customer_feedback: string | null
          customer_name: string
          customer_notified: boolean | null
          customer_phone: string | null
          customer_satisfaction_rating: number | null
          customer_signature_path: string | null
          departed_at: string | null
          description: string | null
          dispatched_at: string | null
          dispatcher_id: string | null
          equipment_needed: string[] | null
          estimated_cost: number | null
          estimated_duration_minutes: number | null
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          internal_notes: string | null
          invoice_document_path: string | null
          is_billable: boolean | null
          is_recurring: boolean | null
          is_warranty_work: boolean | null
          labor_cost: number | null
          next_service_date: string | null
          parts_cost: number | null
          parts_needed: Json | null
          photos: Json | null
          priority: string
          project_id: string | null
          recurring_frequency: string | null
          requested_date: string | null
          requested_time_end: string | null
          requested_time_start: string | null
          requires_follow_up: boolean | null
          resolution_notes: string | null
          safety_notes: string | null
          scheduled_date: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          service_location_lat: number | null
          service_location_lng: number | null
          service_type: string
          special_requirements: string | null
          status: string
          technician_notes: string | null
          title: string
          tools_required: string[] | null
          trade_required: string | null
          traffic_conditions: string | null
          travel_cost: number | null
          updated_at: string
          weather_conditions: string | null
          work_completed_at: string | null
          work_order_document_path: string | null
          work_performed: string | null
          work_started_at: string | null
        }
        Insert: {
          access_instructions?: string | null
          actual_cost?: number | null
          after_photos?: Json | null
          arrival_notification_sent?: boolean | null
          arrived_at?: string | null
          assigned_technician_id?: string | null
          backup_technician_id?: string | null
          before_photos?: Json | null
          call_number: string
          company_id: string
          completion_notification_sent?: boolean | null
          completion_status?: string | null
          created_at?: string
          created_by?: string | null
          customer_address: string
          customer_company?: string | null
          customer_contact_person?: string | null
          customer_email?: string | null
          customer_feedback?: string | null
          customer_name: string
          customer_notified?: boolean | null
          customer_phone?: string | null
          customer_satisfaction_rating?: number | null
          customer_signature_path?: string | null
          departed_at?: string | null
          description?: string | null
          dispatched_at?: string | null
          dispatcher_id?: string | null
          equipment_needed?: string[] | null
          estimated_cost?: number | null
          estimated_duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          internal_notes?: string | null
          invoice_document_path?: string | null
          is_billable?: boolean | null
          is_recurring?: boolean | null
          is_warranty_work?: boolean | null
          labor_cost?: number | null
          next_service_date?: string | null
          parts_cost?: number | null
          parts_needed?: Json | null
          photos?: Json | null
          priority?: string
          project_id?: string | null
          recurring_frequency?: string | null
          requested_date?: string | null
          requested_time_end?: string | null
          requested_time_start?: string | null
          requires_follow_up?: boolean | null
          resolution_notes?: string | null
          safety_notes?: string | null
          scheduled_date?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          service_location_lat?: number | null
          service_location_lng?: number | null
          service_type: string
          special_requirements?: string | null
          status?: string
          technician_notes?: string | null
          title: string
          tools_required?: string[] | null
          trade_required?: string | null
          traffic_conditions?: string | null
          travel_cost?: number | null
          updated_at?: string
          weather_conditions?: string | null
          work_completed_at?: string | null
          work_order_document_path?: string | null
          work_performed?: string | null
          work_started_at?: string | null
        }
        Update: {
          access_instructions?: string | null
          actual_cost?: number | null
          after_photos?: Json | null
          arrival_notification_sent?: boolean | null
          arrived_at?: string | null
          assigned_technician_id?: string | null
          backup_technician_id?: string | null
          before_photos?: Json | null
          call_number?: string
          company_id?: string
          completion_notification_sent?: boolean | null
          completion_status?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string
          customer_company?: string | null
          customer_contact_person?: string | null
          customer_email?: string | null
          customer_feedback?: string | null
          customer_name?: string
          customer_notified?: boolean | null
          customer_phone?: string | null
          customer_satisfaction_rating?: number | null
          customer_signature_path?: string | null
          departed_at?: string | null
          description?: string | null
          dispatched_at?: string | null
          dispatcher_id?: string | null
          equipment_needed?: string[] | null
          estimated_cost?: number | null
          estimated_duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          internal_notes?: string | null
          invoice_document_path?: string | null
          is_billable?: boolean | null
          is_recurring?: boolean | null
          is_warranty_work?: boolean | null
          labor_cost?: number | null
          next_service_date?: string | null
          parts_cost?: number | null
          parts_needed?: Json | null
          photos?: Json | null
          priority?: string
          project_id?: string | null
          recurring_frequency?: string | null
          requested_date?: string | null
          requested_time_end?: string | null
          requested_time_start?: string | null
          requires_follow_up?: boolean | null
          resolution_notes?: string | null
          safety_notes?: string | null
          scheduled_date?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          service_location_lat?: number | null
          service_location_lng?: number | null
          service_type?: string
          special_requirements?: string | null
          status?: string
          technician_notes?: string | null
          title?: string
          tools_required?: string[] | null
          trade_required?: string | null
          traffic_conditions?: string | null
          travel_cost?: number | null
          updated_at?: string
          weather_conditions?: string | null
          work_completed_at?: string | null
          work_order_document_path?: string | null
          work_performed?: string | null
          work_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_calls_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_backup_technician_id_fkey"
            columns: ["backup_technician_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_dispatcher_id_fkey"
            columns: ["dispatcher_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "service_calls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_metadata: Json | null
          account_name: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_metadata?: Json | null
          account_name: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_metadata?: Json | null
          account_name?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          platform?: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_analytics: {
        Row: {
          account_id: string
          company_id: string
          created_at: string | null
          followers_count: number | null
          id: string
          metric_date: string
          metrics_data: Json | null
          platform: Database["public"]["Enums"]["social_platform"]
          posts_count: number | null
          total_engagement: number | null
          total_impressions: number | null
          total_reach: number | null
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string | null
          followers_count?: number | null
          id?: string
          metric_date: string
          metrics_data?: Json | null
          platform: Database["public"]["Enums"]["social_platform"]
          posts_count?: number | null
          total_engagement?: number | null
          total_impressions?: number | null
          total_reach?: number | null
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string | null
          followers_count?: number | null
          id?: string
          metric_date?: string
          metrics_data?: Json | null
          platform?: Database["public"]["Enums"]["social_platform"]
          posts_count?: number | null
          total_engagement?: number | null
          total_impressions?: number | null
          total_reach?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_analytics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_automation_logs: {
        Row: {
          blog_post_id: string | null
          company_id: string
          created_at: string | null
          error_message: string | null
          id: string
          platforms_processed: Json
          posts_created: number | null
          status: string
          trigger_type: string
          updated_at: string | null
          webhook_response: Json | null
          webhook_sent: boolean | null
        }
        Insert: {
          blog_post_id?: string | null
          company_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          platforms_processed?: Json
          posts_created?: number | null
          status?: string
          trigger_type: string
          updated_at?: string | null
          webhook_response?: Json | null
          webhook_sent?: boolean | null
        }
        Update: {
          blog_post_id?: string | null
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          platforms_processed?: Json
          posts_created?: number | null
          status?: string
          trigger_type?: string
          updated_at?: string | null
          webhook_response?: Json | null
          webhook_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_automation_logs_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_automation_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_automation_settings: {
        Row: {
          ai_content_generation: boolean | null
          auto_post_on_publish: boolean | null
          company_id: string
          content_templates: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          platforms_enabled: Json | null
          posting_schedule: Json | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          ai_content_generation?: boolean | null
          auto_post_on_publish?: boolean | null
          company_id: string
          content_templates?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          platforms_enabled?: Json | null
          posting_schedule?: Json | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          ai_content_generation?: boolean | null
          auto_post_on_publish?: boolean | null
          company_id?: string
          content_templates?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          platforms_enabled?: Json | null
          posting_schedule?: Json | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_automation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_post_results: {
        Row: {
          created_at: string | null
          engagement_data: Json | null
          error_message: string | null
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          platform_post_id: string | null
          post_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          engagement_data?: Json | null
          error_message?: string | null
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          platform_post_id?: string | null
          post_id: string
          published_at?: string | null
          status: Database["public"]["Enums"]["post_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          engagement_data?: Json | null
          error_message?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          platform_post_id?: string | null
          post_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_post_results_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_posts: {
        Row: {
          blog_post_id: string | null
          company_id: string
          content: string
          content_type: Database["public"]["Enums"]["content_type"] | null
          created_at: string | null
          created_by: string | null
          id: string
          media_urls: Json | null
          platforms: Json
          post_metadata: Json | null
          project_id: string | null
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          template_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          blog_post_id?: string | null
          company_id: string
          content: string
          content_type?: Database["public"]["Enums"]["content_type"] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_urls?: Json | null
          platforms?: Json
          post_metadata?: Json | null
          project_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          blog_post_id?: string | null
          company_id?: string
          content?: string
          content_type?: Database["public"]["Enums"]["content_type"] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_urls?: Json | null
          platforms?: Json
          post_metadata?: Json | null
          project_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "social_media_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_templates: {
        Row: {
          category: string | null
          company_id: string
          content: string
          content_type: Database["public"]["Enums"]["content_type"] | null
          created_at: string | null
          created_by: string | null
          default_platforms: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_variables: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          company_id: string
          content: string
          content_type?: Database["public"]["Enums"]["content_type"] | null
          created_at?: string | null
          created_by?: string | null
          default_platforms?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_variables?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          company_id?: string
          content?: string
          content_type?: Database["public"]["Enums"]["content_type"] | null
          created_at?: string | null
          created_by?: string | null
          default_platforms?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_variables?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_platform_configs: {
        Row: {
          api_endpoints: Json | null
          created_at: string | null
          id: string
          image_requirements: Json | null
          is_active: boolean | null
          max_text_length: number | null
          platform: Database["public"]["Enums"]["social_platform"]
          rate_limits: Json | null
          supports_images: boolean | null
          supports_scheduling: boolean | null
          supports_videos: boolean | null
          updated_at: string | null
          video_requirements: Json | null
        }
        Insert: {
          api_endpoints?: Json | null
          created_at?: string | null
          id?: string
          image_requirements?: Json | null
          is_active?: boolean | null
          max_text_length?: number | null
          platform: Database["public"]["Enums"]["social_platform"]
          rate_limits?: Json | null
          supports_images?: boolean | null
          supports_scheduling?: boolean | null
          supports_videos?: boolean | null
          updated_at?: string | null
          video_requirements?: Json | null
        }
        Update: {
          api_endpoints?: Json | null
          created_at?: string | null
          id?: string
          image_requirements?: Json | null
          is_active?: boolean | null
          max_text_length?: number | null
          platform?: Database["public"]["Enums"]["social_platform"]
          rate_limits?: Json | null
          supports_images?: boolean | null
          supports_scheduling?: boolean | null
          supports_videos?: boolean | null
          updated_at?: string | null
          video_requirements?: Json | null
        }
        Relationships: []
      }
      subcontractor_disclosures: {
        Row: {
          approval_date: string | null
          bid_submission_id: string
          bonding_capacity: number | null
          business_address: string | null
          business_structure: string | null
          certification_documents_path: string | null
          certification_numbers: string[] | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          duns_number: string | null
          email: string | null
          has_required_insurance: boolean | null
          id: string
          insurance_carrier: string | null
          insurance_certificate_path: string | null
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          is_dbe_certified: boolean | null
          is_mbe_certified: boolean | null
          is_small_business: boolean | null
          is_veteran_owned: boolean | null
          is_wbe_certified: boolean | null
          license_classification: string | null
          license_copy_path: string | null
          license_number: string | null
          notes: string | null
          percentage_of_total: number | null
          phone: string | null
          previous_work_description: string | null
          proposed_completion_date: string | null
          proposed_start_date: string | null
          reference_contacts: Json | null
          status: string
          subcontract_amount: number
          subcontractor_name: string
          tax_id: string | null
          updated_at: string
          w9_form_path: string | null
          work_category: string
          work_description: string
        }
        Insert: {
          approval_date?: string | null
          bid_submission_id: string
          bonding_capacity?: number | null
          business_address?: string | null
          business_structure?: string | null
          certification_documents_path?: string | null
          certification_numbers?: string[] | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          duns_number?: string | null
          email?: string | null
          has_required_insurance?: boolean | null
          id?: string
          insurance_carrier?: string | null
          insurance_certificate_path?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          is_dbe_certified?: boolean | null
          is_mbe_certified?: boolean | null
          is_small_business?: boolean | null
          is_veteran_owned?: boolean | null
          is_wbe_certified?: boolean | null
          license_classification?: string | null
          license_copy_path?: string | null
          license_number?: string | null
          notes?: string | null
          percentage_of_total?: number | null
          phone?: string | null
          previous_work_description?: string | null
          proposed_completion_date?: string | null
          proposed_start_date?: string | null
          reference_contacts?: Json | null
          status?: string
          subcontract_amount: number
          subcontractor_name: string
          tax_id?: string | null
          updated_at?: string
          w9_form_path?: string | null
          work_category: string
          work_description: string
        }
        Update: {
          approval_date?: string | null
          bid_submission_id?: string
          bonding_capacity?: number | null
          business_address?: string | null
          business_structure?: string | null
          certification_documents_path?: string | null
          certification_numbers?: string[] | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          duns_number?: string | null
          email?: string | null
          has_required_insurance?: boolean | null
          id?: string
          insurance_carrier?: string | null
          insurance_certificate_path?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          is_dbe_certified?: boolean | null
          is_mbe_certified?: boolean | null
          is_small_business?: boolean | null
          is_veteran_owned?: boolean | null
          is_wbe_certified?: boolean | null
          license_classification?: string | null
          license_copy_path?: string | null
          license_number?: string | null
          notes?: string | null
          percentage_of_total?: number | null
          phone?: string | null
          previous_work_description?: string | null
          proposed_completion_date?: string | null
          proposed_start_date?: string | null
          reference_contacts?: Json | null
          status?: string
          subcontract_amount?: number
          subcontractor_name?: string
          tax_id?: string | null
          updated_at?: string
          w9_form_path?: string | null
          work_category?: string
          work_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_disclosures_bid_submission_id_fkey"
            columns: ["bid_submission_id"]
            isOneToOne: false
            referencedRelation: "bid_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_disclosures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_reviews: {
        Row: {
          comments: string | null
          company_id: string
          created_at: string
          id: string
          review_status: string
          reviewer_id: string
          submittal_id: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          company_id: string
          created_at?: string
          id?: string
          review_status: string
          reviewer_id: string
          submittal_id: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          company_id?: string
          created_at?: string
          id?: string
          review_status?: string
          reviewer_id?: string
          submittal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_reviews_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          approved_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string | null
          spec_section: string | null
          status: string | null
          submittal_number: string
          submitted_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          spec_section?: string | null
          status?: string | null
          submittal_number: string
          submitted_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          spec_section?: string | null
          status?: string | null
          submittal_number?: string
          submitted_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          billing_period: string | null
          complimentary_expires_at: string | null
          complimentary_granted_at: string | null
          complimentary_granted_by: string | null
          complimentary_reason: string | null
          complimentary_type: string | null
          created_at: string
          email: string
          id: string
          is_complimentary: boolean | null
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
          complimentary_expires_at?: string | null
          complimentary_granted_at?: string | null
          complimentary_granted_by?: string | null
          complimentary_reason?: string | null
          complimentary_type?: string | null
          created_at?: string
          email: string
          id?: string
          is_complimentary?: boolean | null
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
          complimentary_expires_at?: string | null
          complimentary_granted_at?: string | null
          complimentary_granted_by?: string | null
          complimentary_reason?: string | null
          complimentary_type?: string | null
          created_at?: string
          email?: string
          id?: string
          is_complimentary?: boolean | null
          renewal_notification_sent_at?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_subscribers_user_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_email: string | null
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_email?: string | null
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_email?: string | null
          sender_name?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          company_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          description: string
          id: string
          metadata: Json | null
          priority: string
          source: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          description: string
          id?: string
          metadata?: Json | null
          priority?: string
          source?: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          source?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_admin_settings: {
        Row: {
          created_at: string
          created_by: string | null
          document_management: Json | null
          email_templates: Json | null
          form_templates: Json | null
          id: string
          report_templates: Json | null
          system_preferences: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_management?: Json | null
          email_templates?: Json | null
          form_templates?: Json | null
          id?: string
          report_templates?: Json | null
          system_preferences?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_management?: Json | null
          email_templates?: Json | null
          form_templates?: Json | null
          id?: string
          report_templates?: Json | null
          system_preferences?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_admin_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      task_activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          company_id: string
          created_at: string | null
          dependency_type: string
          id: string
          is_active: boolean | null
          lag_days: number | null
          predecessor_task_id: string
          successor_task_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dependency_type?: string
          id?: string
          is_active?: boolean | null
          lag_days?: number | null
          predecessor_task_id: string
          successor_task_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dependency_type?: string
          id?: string
          is_active?: boolean | null
          lag_days?: number | null
          predecessor_task_id?: string
          successor_task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_predecessor_task_id_fkey"
            columns: ["predecessor_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_successor_task_id_fkey"
            columns: ["successor_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          notification_type: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_resource_allocations: {
        Row: {
          allocation_percentage: number | null
          company_id: string
          cost_per_unit: number | null
          created_at: string | null
          end_date: string | null
          id: string
          resource_id: string | null
          resource_name: string
          resource_type: string
          start_date: string | null
          task_id: string
          total_units: number | null
          updated_at: string | null
        }
        Insert: {
          allocation_percentage?: number | null
          company_id: string
          cost_per_unit?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          resource_id?: string | null
          resource_name: string
          resource_type: string
          start_date?: string | null
          task_id: string
          total_units?: number | null
          updated_at?: string | null
        }
        Update: {
          allocation_percentage?: number | null
          company_id?: string
          cost_per_unit?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          resource_id?: string | null
          resource_name?: string
          resource_type?: string
          start_date?: string | null
          task_id?: string
          total_units?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_resource_allocations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          id: string
          order_index: number | null
          parent_task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          parent_task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          parent_task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: Database["public"]["Enums"]["task_category"] | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          due_days_from_start: number | null
          estimated_hours: number | null
          id: string
          name: string
          phase_order: number | null
          priority: string | null
          project_template_id: string
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["task_category"] | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_days_from_start?: number | null
          estimated_hours?: number | null
          id?: string
          name: string
          phase_order?: number | null
          priority?: string | null
          project_template_id: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["task_category"] | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_days_from_start?: number | null
          estimated_hours?: number | null
          id?: string
          name?: string
          phase_order?: number | null
          priority?: string | null
          project_template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_project_template_id_fkey"
            columns: ["project_template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_entries: {
        Row: {
          created_at: string | null
          date_logged: string
          description: string | null
          hours_logged: number
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_logged?: string
          description?: string | null
          hours_logged: number
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_logged?: string
          description?: string | null
          hours_logged?: number
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["task_category"] | null
          company_id: string
          completion_percentage: number | null
          created_at: string
          created_by: string | null
          dependencies: string[] | null
          description: string | null
          due_date: string | null
          duration_days: number | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          is_critical_path: boolean | null
          is_milestone: boolean | null
          milestone_type: string | null
          name: string
          phase_id: string | null
          priority: string | null
          project_id: string
          resource_requirements: Json | null
          start_date: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["task_category"] | null
          company_id: string
          completion_percentage?: number | null
          created_at?: string
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          duration_days?: number | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_critical_path?: boolean | null
          is_milestone?: boolean | null
          milestone_type?: string | null
          name: string
          phase_id?: string | null
          priority?: string | null
          project_id: string
          resource_requirements?: Json | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["task_category"] | null
          company_id?: string
          completion_percentage?: number | null
          created_at?: string
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          duration_days?: number | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_critical_path?: boolean | null
          is_milestone?: boolean | null
          milestone_type?: string | null
          name?: string
          phase_id?: string | null
          priority?: string | null
          project_id?: string
          resource_requirements?: Json | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
      technician_locations: {
        Row: {
          accuracy: number | null
          heading: number | null
          id: string
          is_active: boolean | null
          is_on_duty: boolean | null
          latitude: number
          longitude: number
          recorded_at: string
          service_call_id: string | null
          speed: number | null
          status: string | null
          technician_id: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          is_active?: boolean | null
          is_on_duty?: boolean | null
          latitude: number
          longitude: number
          recorded_at?: string
          service_call_id?: string | null
          speed?: number | null
          status?: string | null
          technician_id: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          is_active?: boolean | null
          is_on_duty?: boolean | null
          latitude?: number
          longitude?: number
          recorded_at?: string
          service_call_id?: string | null
          speed?: number | null
          status?: string | null
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_locations_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_locations_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          location: string | null
          location_accuracy: number | null
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
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          location?: string | null
          location_accuracy?: number | null
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
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          location?: string | null
          location_accuracy?: number | null
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
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
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
      usage_metrics: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          company_id: string | null
          created_at: string
          id: string
          metric_type: string
          metric_value: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          company_id?: string | null
          created_at?: string
          id?: string
          metric_type: string
          metric_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          company_id?: string | null
          created_at?: string
          id?: string
          metric_type?: string
          metric_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          accessibility_preferences: Json | null
          created_at: string
          dashboard_layout: Json | null
          email_notifications: Json | null
          favorite_shortcuts: Json | null
          id: string
          in_app_notifications: Json | null
          language: string | null
          mobile_preferences: Json | null
          sms_notifications: Json | null
          time_zone: string | null
          updated_at: string
          user_id: string
          working_hours: Json | null
        }
        Insert: {
          accessibility_preferences?: Json | null
          created_at?: string
          dashboard_layout?: Json | null
          email_notifications?: Json | null
          favorite_shortcuts?: Json | null
          id?: string
          in_app_notifications?: Json | null
          language?: string | null
          mobile_preferences?: Json | null
          sms_notifications?: Json | null
          time_zone?: string | null
          updated_at?: string
          user_id: string
          working_hours?: Json | null
        }
        Update: {
          accessibility_preferences?: Json | null
          created_at?: string
          dashboard_layout?: Json | null
          email_notifications?: Json | null
          favorite_shortcuts?: Json | null
          id?: string
          in_app_notifications?: Json | null
          language?: string | null
          mobile_preferences?: Json | null
          sms_notifications?: Json | null
          time_zone?: string | null
          updated_at?: string
          user_id?: string
          working_hours?: Json | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          company_id: string
          current_channel_id: string | null
          id: string
          last_seen_at: string
          metadata: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          current_channel_id?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          current_channel_id?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_current_channel_id_fkey"
            columns: ["current_channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
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
      user_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          location: string | null
          session_token: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          location?: string | null
          session_token: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          location?: string | null
          session_token?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          company_id: string
          coverage_details: string | null
          coverage_limitations: string | null
          created_at: string
          created_by: string | null
          id: string
          installation_date: string | null
          is_transferable: boolean
          is_transferred_to_customer: boolean
          item_description: string | null
          item_name: string
          manufacturer: string | null
          model_number: string | null
          notes: string | null
          project_id: string | null
          purchase_order_id: string | null
          serial_number: string | null
          status: string
          transferred_at: string | null
          transferred_by: string | null
          updated_at: string
          vendor_id: string | null
          warranty_contact_email: string | null
          warranty_contact_name: string | null
          warranty_contact_phone: string | null
          warranty_document_path: string | null
          warranty_duration_months: number
          warranty_end_date: string | null
          warranty_start_date: string
          warranty_type: string
        }
        Insert: {
          company_id: string
          coverage_details?: string | null
          coverage_limitations?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          installation_date?: string | null
          is_transferable?: boolean
          is_transferred_to_customer?: boolean
          item_description?: string | null
          item_name: string
          manufacturer?: string | null
          model_number?: string | null
          notes?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          serial_number?: string | null
          status?: string
          transferred_at?: string | null
          transferred_by?: string | null
          updated_at?: string
          vendor_id?: string | null
          warranty_contact_email?: string | null
          warranty_contact_name?: string | null
          warranty_contact_phone?: string | null
          warranty_document_path?: string | null
          warranty_duration_months: number
          warranty_end_date?: string | null
          warranty_start_date?: string
          warranty_type: string
        }
        Update: {
          company_id?: string
          coverage_details?: string | null
          coverage_limitations?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          installation_date?: string | null
          is_transferable?: boolean
          is_transferred_to_customer?: boolean
          item_description?: string | null
          item_name?: string
          manufacturer?: string | null
          model_number?: string | null
          notes?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          serial_number?: string | null
          status?: string
          transferred_at?: string | null
          transferred_by?: string | null
          updated_at?: string
          vendor_id?: string | null
          warranty_contact_email?: string | null
          warranty_contact_name?: string | null
          warranty_contact_phone?: string | null
          warranty_document_path?: string | null
          warranty_duration_months?: number
          warranty_end_date?: string | null
          warranty_start_date?: string
          warranty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          claim_date: string
          claim_number: string
          claim_photos: string[] | null
          claimant_contact: string | null
          claimant_email: string | null
          claimant_name: string
          correspondence_log: Json | null
          created_at: string
          created_by: string | null
          id: string
          inspection_report_path: string | null
          issue_category: string | null
          issue_description: string
          resolution_cost: number | null
          resolution_details: string | null
          resolution_type: string | null
          resolved_by: string | null
          resolved_date: string | null
          severity: string
          status: string
          updated_at: string
          warranty_id: string
        }
        Insert: {
          claim_date?: string
          claim_number: string
          claim_photos?: string[] | null
          claimant_contact?: string | null
          claimant_email?: string | null
          claimant_name: string
          correspondence_log?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_report_path?: string | null
          issue_category?: string | null
          issue_description: string
          resolution_cost?: number | null
          resolution_details?: string | null
          resolution_type?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          severity?: string
          status?: string
          updated_at?: string
          warranty_id: string
        }
        Update: {
          claim_date?: string
          claim_number?: string
          claim_photos?: string[] | null
          claimant_contact?: string | null
          claimant_email?: string | null
          claimant_name?: string
          correspondence_log?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_report_path?: string | null
          issue_category?: string | null
          issue_description?: string
          resolution_cost?: number | null
          resolution_details?: string | null
          resolution_type?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          severity?: string
          status?: string
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_transfers: {
        Row: {
          created_at: string
          customer_acknowledged: boolean | null
          customer_acknowledged_at: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          project_id: string
          transfer_date: string
          transfer_document_path: string | null
          transfer_reason: string | null
          transferred_by: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          customer_acknowledged?: boolean | null
          customer_acknowledged_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          project_id: string
          transfer_date?: string
          transfer_document_path?: string | null
          transfer_reason?: string | null
          transferred_by: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          customer_acknowledged?: boolean | null
          customer_acknowledged_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          transfer_date?: string
          transfer_document_path?: string | null
          transfer_reason?: string | null
          transferred_by?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_transfers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "warranty_transfers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_transfers_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_delivery_logs: {
        Row: {
          attempt_number: number
          created_at: string
          delivered_at: string | null
          delivery_status: string
          error_message: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_endpoint_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          delivered_at?: string | null
          delivery_status: string
          error_message?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_endpoint_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_endpoint_id?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          endpoint_name: string
          events: Json
          failure_count: number
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_success_at: string | null
          retry_attempts: number
          secret_token: string
          timeout_seconds: number
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          endpoint_name: string
          events?: Json
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          retry_attempts?: number
          secret_token: string
          timeout_seconds?: number
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          endpoint_name?: string
          events?: Json
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          retry_attempts?: number
          secret_token?: string
          timeout_seconds?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          last_processing_error: string | null
          processed: boolean | null
          processed_at: string | null
          processing_attempts: number | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          event_data: Json
          event_type: string
          id?: string
          last_processing_error?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processing_attempts?: number | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          last_processing_error?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processing_attempts?: number | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      workflow_analytics: {
        Row: {
          average_execution_time_ms: number | null
          company_id: string
          created_at: string
          failed_executions: number | null
          id: string
          period_end: string
          period_start: string
          successful_executions: number | null
          total_executions: number | null
          total_time_saved_hours: number | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          average_execution_time_ms?: number | null
          company_id: string
          created_at?: string
          failed_executions?: number | null
          id?: string
          period_end: string
          period_start: string
          successful_executions?: number | null
          total_executions?: number | null
          total_time_saved_hours?: number | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          average_execution_time_ms?: number | null
          company_id?: string
          created_at?: string
          failed_executions?: number | null
          id?: string
          period_end?: string
          period_start?: string
          successful_executions?: number | null
          total_executions?: number | null
          total_time_saved_hours?: number | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_analytics_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          workflow_steps: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          workflow_steps?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          workflow_steps?: Json
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_steps: number | null
          created_at: string
          error_message: string | null
          execution_log: Json | null
          id: string
          started_at: string
          status: string
          total_steps: number | null
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_steps?: number | null
          created_at?: string
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          started_at?: string
          status?: string
          total_steps?: number | null
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_steps?: number | null
          created_at?: string
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          started_at?: string
          status?: string
          total_steps?: number | null
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: string
          step_config: Json
          step_index: number
          step_name: string
          step_type: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_config?: Json
          step_index: number
          step_name: string
          step_type: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_config?: Json
          step_index?: number
          step_name?: string
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          company_id: string | null
          complexity_level: string | null
          compliance_requirements: Json | null
          cost_breakdown_template: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          equipment_requirements: Json | null
          id: string
          industry_type: string
          is_active: boolean | null
          is_system_template: boolean | null
          labor_roles: Json | null
          material_categories: Json | null
          quality_checkpoints: Json | null
          region_specific: string | null
          required_permits: Json | null
          safety_protocols: Json | null
          standard_tasks: Json
          template_name: string
          trade_specialization: string | null
          typical_duration_days: number | null
          updated_at: string
          usage_count: number | null
          workflow_phases: Json
        }
        Insert: {
          company_id?: string | null
          complexity_level?: string | null
          compliance_requirements?: Json | null
          cost_breakdown_template?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_requirements?: Json | null
          id?: string
          industry_type: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          labor_roles?: Json | null
          material_categories?: Json | null
          quality_checkpoints?: Json | null
          region_specific?: string | null
          required_permits?: Json | null
          safety_protocols?: Json | null
          standard_tasks?: Json
          template_name: string
          trade_specialization?: string | null
          typical_duration_days?: number | null
          updated_at?: string
          usage_count?: number | null
          workflow_phases?: Json
        }
        Update: {
          company_id?: string | null
          complexity_level?: string | null
          compliance_requirements?: Json | null
          cost_breakdown_template?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_requirements?: Json | null
          id?: string
          industry_type?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          labor_roles?: Json | null
          material_categories?: Json | null
          quality_checkpoints?: Json | null
          region_specific?: string | null
          required_permits?: Json | null
          safety_protocols?: Json | null
          standard_tasks?: Json
          template_name?: string
          trade_specialization?: string | null
          typical_duration_days?: number | null
          updated_at?: string
          usage_count?: number | null
          workflow_phases?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          last_execution_at: string | null
          next_execution_at: string | null
          trigger_config: Json
          trigger_type: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_execution_at?: string | null
          next_execution_at?: string | null
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_execution_at?: string | null
          next_execution_at?: string | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      project_pl_summary: {
        Row: {
          company_id: string | null
          completion_percentage: number | null
          project_id: string | null
          project_name: string | null
          total_budget: number | null
        }
        Insert: {
          company_id?: string | null
          completion_percentage?: number | null
          project_id?: string | null
          project_name?: string | null
          total_budget?: number | null
        }
        Update: {
          company_id?: string | null
          completion_percentage?: number | null
          project_id?: string | null
          project_name?: string | null
          total_budget?: number | null
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
    }
    Functions: {
      add_subscriber_to_funnel: {
        Args:
          | {
              p_email: string
              p_first_name?: string
              p_funnel_id: string
              p_last_name?: string
              p_source?: string
            }
          | { p_email: string; p_funnel_id: string; p_source?: string }
        Returns: string
      }
      calculate_critical_path: {
        Args: { p_project_id: string }
        Returns: Json
      }
      calculate_enhanced_lead_score: {
        Args: { p_lead_id: string }
        Returns: Json
      }
      calculate_incident_metrics: {
        Args: { p_incident_id: string }
        Returns: undefined
      }
      calculate_lead_score: {
        Args: { p_lead_id: string }
        Returns: number
      }
      calculate_next_generation_time: {
        Args: { frequency: string; generation_time: string; timezone?: string }
        Returns: string
      }
      calculate_project_completion: {
        Args: { p_project_id: string }
        Returns: number
      }
      calculate_project_risk_score: {
        Args: { p_company_id: string; p_project_id: string }
        Returns: Json
      }
      calculate_security_metrics: {
        Args: { p_company_id: string }
        Returns: Json
      }
      check_equipment_availability: {
        Args:
          | {
              p_end_date: string
              p_equipment_id: string
              p_exclude_assignment_id?: string
              p_requested_quantity?: number
              p_start_date: string
            }
          | { p_end_date: string; p_equipment_id: string; p_start_date: string }
        Returns: Json
      }
      check_project_requirements: {
        Args: { p_contract_value: number; p_project_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args:
          | { p_action: string; p_limit_per_hour?: number; p_user_id: string }
          | {
              p_endpoint: string
              p_identifier: string
              p_identifier_type: string
              p_ip_address?: unknown
              p_method: string
            }
        Returns: boolean
      }
      check_type_exists: {
        Args: { type_name: string }
        Returns: boolean
      }
      create_company_affiliate_code: {
        Args: { p_company_id: string }
        Returns: string
      }
      create_document_version: {
        Args:
          | {
              p_checksum?: string
              p_document_id: string
              p_file_path: string
              p_file_size: number
              p_version_notes?: string
            }
          | { p_document_id: string; p_version_data: Json }
        Returns: string
      }
      decrypt_stripe_key: {
        Args: { encrypted_key: string }
        Returns: string
      }
      generate_affiliate_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_claim_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_estimate_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_po_number: {
        Args: Record<PropertyKey, never> | { company_uuid: string }
        Returns: string
      }
      generate_work_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_promotions: {
        Args: Record<PropertyKey, never> | { p_display_location?: string }
        Returns: {
          applies_to: string[]
          description: string
          discount_percentage: number
          display_on: string[]
          end_date: string
          id: string
          name: string
          start_date: string
        }[]
      }
      get_equipment_schedule: {
        Args:
          | {
              p_company_id: string
              p_end_date?: string
              p_equipment_id?: string
              p_start_date?: string
            }
          | {
              p_end_date?: string
              p_equipment_id: string
              p_start_date?: string
            }
        Returns: {
          assigned_quantity: number
          assignment_id: string
          assignment_status: string
          days_duration: number
          end_date: string
          equipment_id: string
          equipment_name: string
          project_id: string
          project_name: string
          start_date: string
        }[]
      }
      get_role_permissions: {
        Args:
          | { p_role: Database["public"]["Enums"]["user_role"] }
          | { p_role: string }
        Returns: Json
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
      grant_root_admin_complimentary: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      handle_failed_login: {
        Args:
          | { p_ip_address?: unknown; p_user_agent?: string; p_user_id: string }
          | { p_user_id: string }
        Returns: undefined
      }
      increment_article_view_count: {
        Args:
          | {
              article_id_param: string
              ip_address_param?: unknown
              user_agent_param?: string
              user_id_param?: string
            }
          | { p_article_id: string }
        Returns: undefined
      }
      is_account_locked: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      log_api_usage: {
        Args: {
          p_api_key_hash: string
          p_endpoint: string
          p_ip_address?: unknown
          p_method: string
          p_processing_time_ms?: number
          p_response_status?: number
          p_user_agent?: string
        }
        Returns: string
      }
      log_audit_event: {
        Args:
          | {
              p_action_type: string
              p_company_id: string
              p_compliance_category?: string
              p_description?: string
              p_ip_address?: unknown
              p_metadata?: Json
              p_new_values?: Json
              p_old_values?: Json
              p_resource_id?: string
              p_resource_name?: string
              p_resource_type: string
              p_risk_level?: string
              p_session_id?: string
              p_user_agent?: string
              p_user_id: string
            }
          | {
              p_new_values?: Json
              p_old_values?: Json
              p_operation: string
              p_record_id: string
              p_table_name: string
            }
        Returns: undefined
      }
      log_consent_withdrawal: {
        Args: { p_consent_type: string; p_user_id: string }
        Returns: undefined
      }
      log_data_access: {
        Args:
          | {
              p_access_method?: string
              p_access_purpose?: string
              p_company_id: string
              p_data_classification: string
              p_data_type: string
              p_ip_address?: unknown
              p_lawful_basis?: string
              p_resource_id: string
              p_resource_name?: string
              p_session_id?: string
              p_user_agent?: string
              p_user_id: string
            }
          | { p_access_type: string; p_record_id: string; p_table_name: string }
        Returns: undefined
      }
      log_security_event: {
        Args:
          | {
              p_description?: string
              p_event_type: string
              p_ip_address?: unknown
              p_location?: string
              p_metadata?: Json
              p_severity?: string
              p_user_agent?: string
              p_user_id: string
            }
          | { p_details?: Json; p_event_type: string }
          | {
              p_details?: Json
              p_event_type: string
              p_ip_address?: unknown
              p_user_agent?: string
              p_user_id: string
            }
        Returns: string
      }
      log_sensitive_data_access: {
        Args: {
          p_access_type?: string
          p_company_id: string
          p_resource_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      publish_scheduled_blog_posts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      queue_next_blog_generation: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      reset_failed_attempts: {
        Args:
          | { p_ip_address?: unknown; p_user_agent?: string; p_user_id: string }
          | { p_user_id: string }
        Returns: undefined
      }
      trigger_security_alert: {
        Args:
          | {
              p_affected_resources?: Json
              p_alert_type: string
              p_company_id: string
              p_description?: string
              p_event_data?: Json
              p_severity: string
              p_title: string
            }
          | { p_alert_type: string; p_details?: Json; p_severity?: string }
        Returns: string
      }
      validate_api_permission: {
        Args: {
          p_api_key_hash: string
          p_company_id?: string
          p_permission: string
        }
        Returns: boolean
      }
      validate_post_for_platform: {
        Args:
          | {
              p_content: string
              p_media_urls?: Json
              p_platform: Database["public"]["Enums"]["social_platform"]
            }
          | { p_platform: string; p_post_content: string }
        Returns: Json
      }
    }
    Enums: {
      content_type: "text" | "image" | "video" | "carousel" | "article"
      data_classification: "public" | "internal" | "confidential" | "restricted"
      industry_type:
        | "residential"
        | "commercial"
        | "civil_infrastructure"
        | "specialty_trades"
      post_status: "draft" | "scheduled" | "published" | "failed" | "cancelled"
      social_platform:
        | "linkedin"
        | "facebook"
        | "instagram"
        | "twitter"
        | "threads"
        | "buffer"
        | "hootsuite"
      subscription_tier: "starter" | "professional" | "enterprise"
      task_category:
        | "general"
        | "permit"
        | "estimate"
        | "inspection"
        | "material_order"
        | "labor"
        | "safety"
        | "quality_control"
        | "client_communication"
        | "documentation"
        | "financial"
        | "equipment"
      user_role:
        | "root_admin"
        | "admin"
        | "project_manager"
        | "field_supervisor"
        | "office_staff"
        | "accounting"
        | "client_portal"
        | "technician"
        | "foreman"
        | "superintendent"
        | "estimator"
        | "safety_officer"
        | "quality_inspector"
        | "equipment_operator"
        | "journeyman"
        | "apprentice"
        | "laborer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      content_type: ["text", "image", "video", "carousel", "article"],
      data_classification: ["public", "internal", "confidential", "restricted"],
      industry_type: [
        "residential",
        "commercial",
        "civil_infrastructure",
        "specialty_trades",
      ],
      post_status: ["draft", "scheduled", "published", "failed", "cancelled"],
      social_platform: [
        "linkedin",
        "facebook",
        "instagram",
        "twitter",
        "threads",
        "buffer",
        "hootsuite",
      ],
      subscription_tier: ["starter", "professional", "enterprise"],
      task_category: [
        "general",
        "permit",
        "estimate",
        "inspection",
        "material_order",
        "labor",
        "safety",
        "quality_control",
        "client_communication",
        "documentation",
        "financial",
        "equipment",
      ],
      user_role: [
        "root_admin",
        "admin",
        "project_manager",
        "field_supervisor",
        "office_staff",
        "accounting",
        "client_portal",
        "technician",
        "foreman",
        "superintendent",
        "estimator",
        "safety_officer",
        "quality_inspector",
        "equipment_operator",
        "journeyman",
        "apprentice",
        "laborer",
      ],
    },
  },
} as const
