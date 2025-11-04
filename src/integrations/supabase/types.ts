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
      ai_defect_detection: {
        Row: {
          analysis_id: string
          bounding_box: Json | null
          company_id: string
          confidence_score: number | null
          cost_impact_estimate: number | null
          created_at: string
          defect_category: string
          defect_type: string
          description: string | null
          id: string
          location_details: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity_level: string
          status: string
          suggested_action: string | null
          timeline_impact_days: number | null
          updated_at: string
        }
        Insert: {
          analysis_id: string
          bounding_box?: Json | null
          company_id: string
          confidence_score?: number | null
          cost_impact_estimate?: number | null
          created_at?: string
          defect_category: string
          defect_type: string
          description?: string | null
          id?: string
          location_details?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity_level?: string
          status?: string
          suggested_action?: string | null
          timeline_impact_days?: number | null
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          bounding_box?: Json | null
          company_id?: string
          confidence_score?: number | null
          cost_impact_estimate?: number | null
          created_at?: string
          defect_category?: string
          defect_type?: string
          description?: string | null
          id?: string
          location_details?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity_level?: string
          status?: string
          suggested_action?: string | null
          timeline_impact_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_defect_detection_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_quality_analysis"
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
          api_endpoint: string | null
          auth_method: string | null
          auto_update_alias: boolean | null
          context_window: number | null
          cost_rating: number | null
          created_at: string
          deprecated_date: string | null
          deprecation_reason: string | null
          description: string | null
          good_for_long_form: boolean | null
          good_for_seo: boolean | null
          id: string
          is_active: boolean | null
          is_alias: boolean | null
          is_default: boolean | null
          last_updated: string | null
          max_tokens: number | null
          model_alias: string | null
          model_display_name: string
          model_family: string | null
          model_name: string
          points_to_model: string | null
          priority_order: number | null
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
          api_endpoint?: string | null
          auth_method?: string | null
          auto_update_alias?: boolean | null
          context_window?: number | null
          cost_rating?: number | null
          created_at?: string
          deprecated_date?: string | null
          deprecation_reason?: string | null
          description?: string | null
          good_for_long_form?: boolean | null
          good_for_seo?: boolean | null
          id?: string
          is_active?: boolean | null
          is_alias?: boolean | null
          is_default?: boolean | null
          last_updated?: string | null
          max_tokens?: number | null
          model_alias?: string | null
          model_display_name: string
          model_family?: string | null
          model_name: string
          points_to_model?: string | null
          priority_order?: number | null
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
          api_endpoint?: string | null
          auth_method?: string | null
          auto_update_alias?: boolean | null
          context_window?: number | null
          cost_rating?: number | null
          created_at?: string
          deprecated_date?: string | null
          deprecation_reason?: string | null
          description?: string | null
          good_for_long_form?: boolean | null
          good_for_seo?: boolean | null
          id?: string
          is_active?: boolean | null
          is_alias?: boolean | null
          is_default?: boolean | null
          last_updated?: string | null
          max_tokens?: number | null
          model_alias?: string | null
          model_display_name?: string
          model_family?: string | null
          model_name?: string
          points_to_model?: string | null
          priority_order?: number | null
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
      ai_progress_tracking: {
        Row: {
          analysis_id: string
          company_id: string
          completion_percentage: number | null
          created_at: string
          id: string
          identified_activities: Json | null
          milestone_status: Json | null
          predicted_completion_date: string | null
          previous_completion_percentage: number | null
          productivity_metrics: Json | null
          progress_change: number | null
          project_id: string
          quality_indicators: Json | null
          risk_factors: Json | null
          updated_at: string
          variance_from_schedule: number | null
          work_area: string
        }
        Insert: {
          analysis_id: string
          company_id: string
          completion_percentage?: number | null
          created_at?: string
          id?: string
          identified_activities?: Json | null
          milestone_status?: Json | null
          predicted_completion_date?: string | null
          previous_completion_percentage?: number | null
          productivity_metrics?: Json | null
          progress_change?: number | null
          project_id: string
          quality_indicators?: Json | null
          risk_factors?: Json | null
          updated_at?: string
          variance_from_schedule?: number | null
          work_area: string
        }
        Update: {
          analysis_id?: string
          company_id?: string
          completion_percentage?: number | null
          created_at?: string
          id?: string
          identified_activities?: Json | null
          milestone_status?: Json | null
          predicted_completion_date?: string | null
          previous_completion_percentage?: number | null
          productivity_metrics?: Json | null
          progress_change?: number | null
          project_id?: string
          quality_indicators?: Json | null
          risk_factors?: Json | null
          updated_at?: string
          variance_from_schedule?: number | null
          work_area?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_progress_tracking_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_quality_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_quality_analysis: {
        Row: {
          ai_model_used: string
          analysis_results: Json
          analysis_type: string
          company_id: string
          confidence_score: number | null
          created_at: string
          detected_issues: Json
          id: string
          image_url: string
          inspection_id: string | null
          processing_time_ms: number | null
          project_id: string
          recommendations: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_model_used?: string
          analysis_results?: Json
          analysis_type: string
          company_id: string
          confidence_score?: number | null
          created_at?: string
          detected_issues?: Json
          id?: string
          image_url: string
          inspection_id?: string | null
          processing_time_ms?: number | null
          project_id: string
          recommendations?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_model_used?: string
          analysis_results?: Json
          analysis_type?: string
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          detected_issues?: Json
          id?: string
          image_url?: string
          inspection_id?: string | null
          processing_time_ms?: number | null
          project_id?: string
          recommendations?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_quality_analysis_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "quality_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_quality_models: {
        Row: {
          accuracy_score: number | null
          confidence_threshold: number | null
          created_at: string
          id: string
          is_active: boolean | null
          max_image_size_mb: number | null
          model_name: string
          model_parameters: Json | null
          model_type: string
          model_version: string
          performance_metrics: Json | null
          processing_time_avg_ms: number | null
          supported_image_types: string[] | null
          training_date: string | null
          updated_at: string
        }
        Insert: {
          accuracy_score?: number | null
          confidence_threshold?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_image_size_mb?: number | null
          model_name: string
          model_parameters?: Json | null
          model_type: string
          model_version: string
          performance_metrics?: Json | null
          processing_time_avg_ms?: number | null
          supported_image_types?: string[] | null
          training_date?: string | null
          updated_at?: string
        }
        Update: {
          accuracy_score?: number | null
          confidence_threshold?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_image_size_mb?: number | null
          model_name?: string
          model_parameters?: Json | null
          model_type?: string
          model_version?: string
          performance_metrics?: Json | null
          processing_time_avg_ms?: number | null
          supported_image_types?: string[] | null
          training_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_safety_analysis: {
        Row: {
          analysis_id: string
          company_id: string
          compliance_score: number | null
          corrective_actions: Json | null
          created_at: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          immediate_action_required: boolean | null
          regulatory_standards: Json | null
          risk_level: string
          safety_category: string
          safety_recommendations: Json | null
          updated_at: string
          violations_detected: Json | null
        }
        Insert: {
          analysis_id: string
          company_id: string
          compliance_score?: number | null
          corrective_actions?: Json | null
          created_at?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          immediate_action_required?: boolean | null
          regulatory_standards?: Json | null
          risk_level?: string
          safety_category: string
          safety_recommendations?: Json | null
          updated_at?: string
          violations_detected?: Json | null
        }
        Update: {
          analysis_id?: string
          company_id?: string
          compliance_score?: number | null
          corrective_actions?: Json | null
          created_at?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          immediate_action_required?: boolean | null
          regulatory_standards?: Json | null
          risk_level?: string
          safety_category?: string
          safety_recommendations?: Json | null
          updated_at?: string
          violations_detected?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_safety_analysis_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_quality_analysis"
            referencedColumns: ["id"]
          },
        ]
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
      api_documentation: {
        Row: {
          category: string
          content: string
          created_at: string | null
          description: string | null
          endpoint_path: string | null
          error_responses: Json | null
          example_count: number | null
          has_examples: boolean | null
          http_method: string | null
          id: string
          is_published: boolean | null
          last_viewed_at: string | null
          meta_description: string | null
          meta_title: string | null
          request_schema: Json | null
          response_schema: Json | null
          slug: string
          sort_order: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          version: string | null
          view_count: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          description?: string | null
          endpoint_path?: string | null
          error_responses?: Json | null
          example_count?: number | null
          has_examples?: boolean | null
          http_method?: string | null
          id?: string
          is_published?: boolean | null
          last_viewed_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          request_schema?: Json | null
          response_schema?: Json | null
          slug: string
          sort_order?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          version?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          description?: string | null
          endpoint_path?: string | null
          error_responses?: Json | null
          example_count?: number | null
          has_examples?: boolean | null
          http_method?: string | null
          id?: string
          is_published?: boolean | null
          last_viewed_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          request_schema?: Json | null
          response_schema?: Json | null
          slug?: string
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          version?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      api_examples: {
        Row: {
          code: string
          copy_count: number | null
          created_at: string | null
          description: string | null
          documentation_id: string | null
          example_type: string | null
          highlighted_code: string | null
          id: string
          is_request: boolean | null
          language: string
          last_copied_at: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          code: string
          copy_count?: number | null
          created_at?: string | null
          description?: string | null
          documentation_id?: string | null
          example_type?: string | null
          highlighted_code?: string | null
          id?: string
          is_request?: boolean | null
          language: string
          last_copied_at?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          copy_count?: number | null
          created_at?: string | null
          description?: string | null
          documentation_id?: string | null
          example_type?: string | null
          highlighted_code?: string | null
          id?: string
          is_request?: boolean | null
          language?: string
          last_copied_at?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_examples_documentation_id_fkey"
            columns: ["documentation_id"]
            isOneToOne: false
            referencedRelation: "api_documentation"
            referencedColumns: ["id"]
          },
        ]
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          action: string
          action_type: string | null
          changes: Json | null
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          description: string | null
          device_type: string | null
          error_message: string | null
          event_type: string | null
          id: string
          ip_address: string | null
          is_gdpr_relevant: boolean | null
          is_sensitive: boolean | null
          log_hash: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          previous_log_hash: string | null
          request_method: string | null
          request_path: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          retention_date: string | null
          session_id: string | null
          status: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          action_type?: string | null
          changes?: Json | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          device_type?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          is_gdpr_relevant?: boolean | null
          is_sensitive?: boolean | null
          log_hash?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          previous_log_hash?: string | null
          request_method?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          retention_date?: string | null
          session_id?: string | null
          status?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          action_type?: string | null
          changes?: Json | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          device_type?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          is_gdpr_relevant?: boolean | null
          is_sensitive?: boolean | null
          log_hash?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          previous_log_hash?: string | null
          request_method?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          retention_date?: string | null
          session_id?: string | null
          status?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_schedules: {
        Row: {
          algorithm_used: string | null
          balance_workload: boolean | null
          computation_time_ms: number | null
          created_at: string | null
          id: string
          iterations_count: number | null
          minimize_travel: boolean | null
          optimization_score: number | null
          published_at: string | null
          respect_skills: boolean | null
          schedule_date: string
          schedule_name: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          algorithm_used?: string | null
          balance_workload?: boolean | null
          computation_time_ms?: number | null
          created_at?: string | null
          id?: string
          iterations_count?: number | null
          minimize_travel?: boolean | null
          optimization_score?: number | null
          published_at?: string | null
          respect_skills?: boolean | null
          schedule_date: string
          schedule_name: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          algorithm_used?: string | null
          balance_workload?: boolean | null
          computation_time_ms?: number | null
          created_at?: string | null
          id?: string
          iterations_count?: number | null
          minimize_travel?: boolean | null
          optimization_score?: number | null
          published_at?: string | null
          respect_skills?: boolean | null
          schedule_date?: string
          schedule_name?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_communications_log: {
        Row: {
          attachments: Json | null
          automation_rule_id: string | null
          company_id: string
          delivery_method: string | null
          delivery_status: string | null
          error_message: string | null
          id: string
          message_content: string | null
          metadata: Json | null
          project_id: string | null
          recipients: Json | null
          sent_at: string | null
          template_used: string | null
          trigger_event: string
        }
        Insert: {
          attachments?: Json | null
          automation_rule_id?: string | null
          company_id: string
          delivery_method?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          project_id?: string | null
          recipients?: Json | null
          sent_at?: string | null
          template_used?: string | null
          trigger_event: string
        }
        Update: {
          attachments?: Json | null
          automation_rule_id?: string | null
          company_id?: string
          delivery_method?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          project_id?: string | null
          recipients?: Json | null
          sent_at?: string | null
          template_used?: string | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_communications_log_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automated_communications_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automated_communications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "automated_communications_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      automation_rules: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          last_triggered: string | null
          project_id: string | null
          recipient_rules: Json | null
          template_id: string | null
          trigger_conditions: Json | null
          trigger_count: number | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          project_id?: string | null
          recipient_rules?: Json | null
          template_id?: string | null
          trigger_conditions?: Json | null
          trigger_count?: number | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          project_id?: string | null
          recipient_rules?: Json | null
          template_id?: string | null
          trigger_conditions?: Json | null
          trigger_count?: number | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "automation_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_automation_rules_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_trigger_executions: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          processed_at: string | null
          result: Json | null
          rule_id: string
          status: string
          trigger_event_data: Json | null
          triggered_at: string | null
          triggered_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          processed_at?: string | null
          result?: Json | null
          rule_id: string
          status?: string
          trigger_event_data?: Json | null
          triggered_at?: string | null
          triggered_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          processed_at?: string | null
          result?: Json | null
          rule_id?: string
          status?: string
          trigger_event_data?: Json | null
          triggered_at?: string | null
          triggered_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_trigger_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "behavioral_trigger_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_trigger_rules: {
        Row: {
          action_config: Json
          action_type: string
          cooldown_hours: number | null
          created_at: string | null
          created_by: string | null
          event_conditions: Json | null
          event_name: string | null
          id: string
          is_active: boolean | null
          max_triggers_per_user: number | null
          priority: number | null
          rule_description: string | null
          rule_name: string
          schedule_days: number[] | null
          schedule_time: string | null
          schedule_type: string | null
          trigger_type: string
          updated_at: string | null
          user_segment: Json | null
        }
        Insert: {
          action_config: Json
          action_type: string
          cooldown_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          event_conditions?: Json | null
          event_name?: string | null
          id?: string
          is_active?: boolean | null
          max_triggers_per_user?: number | null
          priority?: number | null
          rule_description?: string | null
          rule_name: string
          schedule_days?: number[] | null
          schedule_time?: string | null
          schedule_type?: string | null
          trigger_type: string
          updated_at?: string | null
          user_segment?: Json | null
        }
        Update: {
          action_config?: Json
          action_type?: string
          cooldown_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          event_conditions?: Json | null
          event_name?: string | null
          id?: string
          is_active?: boolean | null
          max_triggers_per_user?: number | null
          priority?: number | null
          rule_description?: string | null
          rule_name?: string
          schedule_days?: number[] | null
          schedule_time?: string | null
          schedule_type?: string | null
          trigger_type?: string
          updated_at?: string | null
          user_segment?: Json | null
        }
        Relationships: []
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
      billing_automation_rules: {
        Row: {
          auto_generate: boolean | null
          auto_send: boolean | null
          created_at: string | null
          id: string
          invoice_template_id: string | null
          is_active: boolean | null
          late_fee_percentage: number | null
          payment_terms_days: number | null
          rule_name: string
          rule_type: string
          tenant_id: string | null
          trigger_condition: Json
        }
        Insert: {
          auto_generate?: boolean | null
          auto_send?: boolean | null
          created_at?: string | null
          id?: string
          invoice_template_id?: string | null
          is_active?: boolean | null
          late_fee_percentage?: number | null
          payment_terms_days?: number | null
          rule_name: string
          rule_type: string
          tenant_id?: string | null
          trigger_condition: Json
        }
        Update: {
          auto_generate?: boolean | null
          auto_send?: boolean | null
          created_at?: string | null
          id?: string
          invoice_template_id?: string | null
          is_active?: boolean | null
          late_fee_percentage?: number | null
          payment_terms_days?: number | null
          rule_name?: string
          rule_type?: string
          tenant_id?: string | null
          trigger_condition?: Json
        }
        Relationships: []
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
          keyword_selection_strategy: string | null
          last_generation_at: string | null
          max_difficulty: number | null
          max_keywords_per_post: number | null
          min_search_volume: number | null
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
          use_keyword_targeting: boolean | null
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
          keyword_selection_strategy?: string | null
          last_generation_at?: string | null
          max_difficulty?: number | null
          max_keywords_per_post?: number | null
          min_search_volume?: number | null
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
          use_keyword_targeting?: boolean | null
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
          keyword_selection_strategy?: string | null
          last_generation_at?: string | null
          max_difficulty?: number | null
          max_keywords_per_post?: number | null
          min_search_volume?: number | null
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
          use_keyword_targeting?: boolean | null
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
      budget_line_items: {
        Row: {
          actual_quantity: number | null
          actual_total: number | null
          budgeted_quantity: number
          budgeted_total: number
          budgeted_unit_cost: number
          category: string
          cost_code_id: string | null
          created_at: string
          description: string
          id: string
          notes: string | null
          project_id: string
          updated_at: string
          variance: number | null
        }
        Insert: {
          actual_quantity?: number | null
          actual_total?: number | null
          budgeted_quantity?: number
          budgeted_total: number
          budgeted_unit_cost: number
          category: string
          cost_code_id?: string | null
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          project_id: string
          updated_at?: string
          variance?: number | null
        }
        Update: {
          actual_quantity?: number | null
          actual_total?: number | null
          budgeted_quantity?: number
          budgeted_total?: number
          budgeted_unit_cost?: number
          category?: string
          cost_code_id?: string | null
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          project_id?: string
          updated_at?: string
          variance?: number | null
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
      certifications: {
        Row: {
          certification_type: string
          company_id: string
          created_at: string
          employee_name: string
          expiry_date: string
          file_url: string | null
          id: string
          issue_date: string
          status: string
          updated_at: string
        }
        Insert: {
          certification_type: string
          company_id: string
          created_at?: string
          employee_name: string
          expiry_date: string
          file_url?: string | null
          id?: string
          issue_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          certification_type?: string
          company_id?: string
          created_at?: string
          employee_name?: string
          expiry_date?: string
          file_url?: string | null
          id?: string
          issue_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      churn_predictions: {
        Row: {
          actual_churn_date: string | null
          actual_churned: boolean | null
          churn_probability: number | null
          confidence_level: number | null
          created_at: string | null
          id: string
          intervention_taken: boolean | null
          intervention_type: string | null
          model_version: string | null
          predicted_churn_date: string | null
          prediction_date: string
          recommended_interventions: Json | null
          risk_factors: Json | null
          user_id: string
        }
        Insert: {
          actual_churn_date?: string | null
          actual_churned?: boolean | null
          churn_probability?: number | null
          confidence_level?: number | null
          created_at?: string | null
          id?: string
          intervention_taken?: boolean | null
          intervention_type?: string | null
          model_version?: string | null
          predicted_churn_date?: string | null
          prediction_date: string
          recommended_interventions?: Json | null
          risk_factors?: Json | null
          user_id: string
        }
        Update: {
          actual_churn_date?: string | null
          actual_churned?: boolean | null
          churn_probability?: number | null
          confidence_level?: number | null
          created_at?: string | null
          id?: string
          intervention_taken?: boolean | null
          intervention_type?: string | null
          model_version?: string | null
          predicted_churn_date?: string | null
          prediction_date?: string
          recommended_interventions?: Json | null
          risk_factors?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      client_communications: {
        Row: {
          attachments: Json | null
          auto_trigger_conditions: Json | null
          automation_rules: Json | null
          client_contact_id: string | null
          communication_type: string | null
          company_id: string
          created_at: string
          id: string
          is_automated: boolean | null
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
          auto_trigger_conditions?: Json | null
          automation_rules?: Json | null
          client_contact_id?: string | null
          communication_type?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_automated?: boolean | null
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
          auto_trigger_conditions?: Json | null
          automation_rules?: Json | null
          client_contact_id?: string | null
          communication_type?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_automated?: boolean | null
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
      client_messages: {
        Row: {
          client_portal_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          message_type: string | null
          project_id: string | null
          read_at: string | null
          sent_by_client: boolean | null
          sent_by_user_id: string | null
          subject: string | null
          tenant_id: string | null
        }
        Insert: {
          client_portal_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string | null
          project_id?: string | null
          read_at?: string | null
          sent_by_client?: boolean | null
          sent_by_user_id?: string | null
          subject?: string | null
          tenant_id?: string | null
        }
        Update: {
          client_portal_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          project_id?: string | null
          read_at?: string | null
          sent_by_client?: boolean | null
          sent_by_user_id?: string | null
          subject?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_messages_client_portal_id_fkey"
            columns: ["client_portal_id"]
            isOneToOne: false
            referencedRelation: "client_portal_access"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          access_token: string
          can_approve_change_orders: boolean | null
          can_make_payments: boolean | null
          can_view_documents: boolean | null
          can_view_financials: boolean | null
          client_email: string
          client_name: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          login_count: number | null
          password_hash: string | null
          project_id: string | null
          tenant_id: string | null
        }
        Insert: {
          access_token: string
          can_approve_change_orders?: boolean | null
          can_make_payments?: boolean | null
          can_view_documents?: boolean | null
          can_view_financials?: boolean | null
          client_email: string
          client_name: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          login_count?: number | null
          password_hash?: string | null
          project_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          access_token?: string
          can_approve_change_orders?: boolean | null
          can_make_payments?: boolean | null
          can_view_documents?: boolean | null
          can_view_financials?: boolean | null
          client_email?: string
          client_name?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          login_count?: number | null
          password_hash?: string | null
          project_id?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      cohort_retention: {
        Row: {
          active_mrr: number | null
          active_users: number
          average_logins: number | null
          average_mrr_per_user: number | null
          average_projects: number | null
          calculated_at: string | null
          cohort: string
          cohort_size: number
          cohort_type: string
          id: string
          period_date: string
          period_number: number
          retained_users: number
          retention_rate: number | null
        }
        Insert: {
          active_mrr?: number | null
          active_users: number
          average_logins?: number | null
          average_mrr_per_user?: number | null
          average_projects?: number | null
          calculated_at?: string | null
          cohort: string
          cohort_size: number
          cohort_type: string
          id?: string
          period_date: string
          period_number: number
          retained_users: number
          retention_rate?: number | null
        }
        Update: {
          active_mrr?: number | null
          active_users?: number
          average_logins?: number | null
          average_mrr_per_user?: number | null
          average_projects?: number | null
          calculated_at?: string | null
          cohort?: string
          cohort_size?: number
          cohort_type?: string
          id?: string
          period_date?: string
          period_number?: number
          retained_users?: number
          retention_rate?: number | null
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
      collection_items: {
        Row: {
          client_name: string
          company_id: string
          created_at: string
          current_balance: number
          days_overdue: number
          id: string
          invoice_number: string
          last_contact_date: string | null
          next_action_date: string | null
          notes: string | null
          original_amount: number
          priority: string
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_name: string
          company_id: string
          created_at?: string
          current_balance: number
          days_overdue: number
          id?: string
          invoice_number: string
          last_contact_date?: string | null
          next_action_date?: string | null
          notes?: string | null
          original_amount: number
          priority?: string
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          company_id?: string
          created_at?: string
          current_balance?: number
          days_overdue?: number
          id?: string
          invoice_number?: string
          last_contact_date?: string | null
          next_action_date?: string | null
          notes?: string | null
          original_amount?: number
          priority?: string
          project_id?: string | null
          status?: string
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          gps_settings: Json | null
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
          gps_settings?: Json | null
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
          gps_settings?: Json | null
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
          access_granted_to: string[] | null
          attestation_signed_at: string | null
          attestation_signed_by: string | null
          compliance_standard: string | null
          created_at: string | null
          date_range_end: string
          date_range_start: string
          download_count: number | null
          expires_at: string | null
          file_hash: string | null
          file_size_bytes: number | null
          file_url: string | null
          filters: Json | null
          findings: Json | null
          generated_at: string | null
          generated_by: string | null
          generation_time_ms: number | null
          id: string
          is_confidential: boolean | null
          last_downloaded_at: string | null
          report_format: string | null
          report_name: string
          report_type: string
          statistics: Json | null
          status: string | null
          summary: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_granted_to?: string[] | null
          attestation_signed_at?: string | null
          attestation_signed_by?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          date_range_end: string
          date_range_start: string
          download_count?: number | null
          expires_at?: string | null
          file_hash?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          filters?: Json | null
          findings?: Json | null
          generated_at?: string | null
          generated_by?: string | null
          generation_time_ms?: number | null
          id?: string
          is_confidential?: boolean | null
          last_downloaded_at?: string | null
          report_format?: string | null
          report_name: string
          report_type: string
          statistics?: Json | null
          status?: string | null
          summary?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_granted_to?: string[] | null
          attestation_signed_at?: string | null
          attestation_signed_by?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          date_range_end?: string
          date_range_start?: string
          download_count?: number | null
          expires_at?: string | null
          file_hash?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          filters?: Json | null
          findings?: Json | null
          generated_at?: string | null
          generated_by?: string | null
          generation_time_ms?: number | null
          id?: string
          is_confidential?: boolean | null
          last_downloaded_at?: string | null
          report_format?: string | null
          report_name?: string
          report_type?: string
          statistics?: Json | null
          status?: string | null
          summary?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      conversion_events: {
        Row: {
          anonymous_id: string | null
          created_at: string | null
          currency: string | null
          device_type: string | null
          event_metadata: Json | null
          event_step: number | null
          event_type: string
          event_value: number | null
          funnel_name: string | null
          id: string
          referrer: string | null
          source_page: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string | null
          currency?: string | null
          device_type?: string | null
          event_metadata?: Json | null
          event_step?: number | null
          event_type: string
          event_value?: number | null
          funnel_name?: string | null
          id?: string
          referrer?: string | null
          source_page?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string | null
          currency?: string | null
          device_type?: string | null
          event_metadata?: Json | null
          event_step?: number | null
          event_type?: string
          event_value?: number | null
          funnel_name?: string | null
          id?: string
          referrer?: string | null
          source_page?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
      crew_skills_matrix: {
        Row: {
          certification_expiry: string | null
          certification_number: string | null
          created_at: string | null
          id: string
          is_certified: boolean | null
          proficiency_level: number | null
          skill_category: string | null
          skill_name: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certification_expiry?: string | null
          certification_number?: string | null
          created_at?: string | null
          id?: string
          is_certified?: boolean | null
          proficiency_level?: number | null
          skill_category?: string | null
          skill_name: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certification_expiry?: string | null
          certification_number?: string | null
          created_at?: string | null
          id?: string
          is_certified?: boolean | null
          proficiency_level?: number | null
          skill_category?: string | null
          skill_name?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_skills_matrix_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_skills_matrix_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_date: string
          activity_type: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          duration_minutes: number | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          outcome: string | null
          updated_at: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_module_relationships: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          relationship_type: string
          source_id: string
          source_module: string
          target_id: string
          target_module: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          relationship_type: string
          source_id: string
          source_module: string
          target_id: string
          target_module: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          relationship_type?: string
          source_id?: string
          source_module?: string
          target_id?: string
          target_module?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_module_relationships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_module_relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      custom_reports: {
        Row: {
          chart_type: string | null
          columns: Json
          created_at: string | null
          created_by: string | null
          data_sources: string[]
          filters: Json | null
          grouping: Json | null
          id: string
          is_public: boolean | null
          is_scheduled: boolean | null
          report_description: string | null
          report_name: string
          report_type: string
          schedule_frequency: string | null
          schedule_recipients: string[] | null
          shared_with: string[] | null
          sorting: Json | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          chart_type?: string | null
          columns: Json
          created_at?: string | null
          created_by?: string | null
          data_sources: string[]
          filters?: Json | null
          grouping?: Json | null
          id?: string
          is_public?: boolean | null
          is_scheduled?: boolean | null
          report_description?: string | null
          report_name: string
          report_type: string
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          shared_with?: string[] | null
          sorting?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          chart_type?: string | null
          columns?: Json
          created_at?: string | null
          created_by?: string | null
          data_sources?: string[]
          filters?: Json | null
          grouping?: Json | null
          id?: string
          is_public?: boolean | null
          is_scheduled?: boolean | null
          report_description?: string | null
          report_name?: string
          report_type?: string
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          shared_with?: string[] | null
          sorting?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_service_requests: {
        Row: {
          additional_documents: Json | null
          customer_email: string
          customer_ip_address: unknown
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
          customer_ip_address?: unknown
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
          customer_ip_address?: unknown
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          action_on_expiry: string | null
          approved_at: string | null
          approved_by: string | null
          archive_location: string | null
          auto_apply: boolean | null
          created_at: string | null
          description: string | null
          exceptions: Json | null
          id: string
          is_active: boolean | null
          jurisdiction: string | null
          last_applied_at: string | null
          legal_basis: string[] | null
          name: string
          next_application_at: string | null
          resource_type: string
          retention_period: unknown
          retention_period_days: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          action_on_expiry?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archive_location?: string | null
          auto_apply?: boolean | null
          created_at?: string | null
          description?: string | null
          exceptions?: Json | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string | null
          last_applied_at?: string | null
          legal_basis?: string[] | null
          name: string
          next_application_at?: string | null
          resource_type: string
          retention_period: unknown
          retention_period_days?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action_on_expiry?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archive_location?: string | null
          auto_apply?: boolean | null
          created_at?: string | null
          description?: string | null
          exceptions?: Json | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string | null
          last_applied_at?: string | null
          legal_basis?: string[] | null
          name?: string
          next_application_at?: string | null
          resource_type?: string
          retention_period?: unknown
          retention_period_days?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      demo_requests: {
        Row: {
          assigned_sales_rep: string | null
          calendar_event_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          company_name: string
          completed_at: string | null
          converted_at: string | null
          converted_to_paid: boolean | null
          created_at: string | null
          demo_type: string | null
          email: string
          first_name: string
          follow_up_sent: boolean | null
          follow_up_sent_at: string | null
          id: string
          last_name: string
          lead_id: string | null
          meeting_url: string | null
          message: string | null
          phone: string | null
          preferred_date: string | null
          preferred_time: string | null
          scheduled_at: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_sales_rep?: string | null
          calendar_event_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_name: string
          completed_at?: string | null
          converted_at?: string | null
          converted_to_paid?: boolean | null
          created_at?: string | null
          demo_type?: string | null
          email: string
          first_name: string
          follow_up_sent?: boolean | null
          follow_up_sent_at?: string | null
          id?: string
          last_name: string
          lead_id?: string | null
          meeting_url?: string | null
          message?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          scheduled_at?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_sales_rep?: string | null
          calendar_event_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_name?: string
          completed_at?: string | null
          converted_at?: string | null
          converted_to_paid?: boolean | null
          created_at?: string | null
          demo_type?: string | null
          email?: string
          first_name?: string
          follow_up_sent?: boolean | null
          follow_up_sent_at?: string | null
          id?: string
          last_name?: string
          lead_id?: string | null
          meeting_url?: string | null
          message?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          scheduled_at?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          ip_address: unknown
          subscriber_id: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          subscriber_id: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          subscriber_id?: string
          user_agent?: string | null
        }
        Relationships: [
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
          ab_test_enabled: boolean | null
          ab_test_traffic_percentage: number | null
          ab_test_variant: string | null
          campaign_description: string | null
          campaign_name: string
          campaign_type: string
          created_at: string | null
          created_by: string | null
          from_email: string | null
          from_name: string | null
          html_content: string | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          preview_text: string | null
          reply_to: string | null
          send_at_time: string | null
          send_delay_minutes: number | null
          send_on_days: number[] | null
          sequence_name: string | null
          sequence_order: number | null
          subject_line: string
          template_id: string | null
          template_variables: Json | null
          text_content: string | null
          total_bounced: number | null
          total_clicked: number | null
          total_complained: number | null
          total_delivered: number | null
          total_opened: number | null
          total_sent: number | null
          total_unsubscribed: number | null
          trigger_conditions: Json | null
          trigger_event: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          ab_test_enabled?: boolean | null
          ab_test_traffic_percentage?: number | null
          ab_test_variant?: string | null
          campaign_description?: string | null
          campaign_name: string
          campaign_type: string
          created_at?: string | null
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          html_content?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          preview_text?: string | null
          reply_to?: string | null
          send_at_time?: string | null
          send_delay_minutes?: number | null
          send_on_days?: number[] | null
          sequence_name?: string | null
          sequence_order?: number | null
          subject_line: string
          template_id?: string | null
          template_variables?: Json | null
          text_content?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          trigger_conditions?: Json | null
          trigger_event?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          ab_test_enabled?: boolean | null
          ab_test_traffic_percentage?: number | null
          ab_test_variant?: string | null
          campaign_description?: string | null
          campaign_name?: string
          campaign_type?: string
          created_at?: string | null
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          html_content?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          preview_text?: string | null
          reply_to?: string | null
          send_at_time?: string | null
          send_delay_minutes?: number | null
          send_on_days?: number[] | null
          sequence_name?: string | null
          sequence_order?: number | null
          subject_line?: string
          template_id?: string | null
          template_variables?: Json | null
          text_content?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          trigger_conditions?: Json | null
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_clicks: {
        Row: {
          city: string | null
          clicked_at: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          email_send_id: string | null
          id: string
          ip_address: unknown
          link_text: string | null
          url: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          email_send_id?: string | null
          id?: string
          ip_address?: unknown
          link_text?: string | null
          url: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          email_send_id?: string | null
          id?: string
          ip_address?: unknown
          link_text?: string | null
          url?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_clicks_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
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
      email_preferences: {
        Row: {
          billing_notifications: boolean | null
          created_at: string | null
          digest_enabled: boolean | null
          digest_frequency: string | null
          email_frequency: string | null
          marketing_emails: boolean | null
          newsletter: boolean | null
          product_updates: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string | null
          trial_nurture: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_notifications?: boolean | null
          created_at?: string | null
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          email_frequency?: string | null
          marketing_emails?: boolean | null
          newsletter?: boolean | null
          product_updates?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string | null
          trial_nurture?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_notifications?: boolean | null
          created_at?: string | null
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          email_frequency?: string | null
          marketing_emails?: boolean | null
          newsletter?: boolean | null
          product_updates?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string | null
          trial_nurture?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempts: number | null
          campaign_id: string | null
          created_at: string | null
          email_send_id: string | null
          id: string
          last_attempt_at: string | null
          priority: number | null
          queue_metadata: Json | null
          recipient_email: string
          scheduled_for: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          campaign_id?: string | null
          created_at?: string | null
          email_send_id?: string | null
          id?: string
          last_attempt_at?: string | null
          priority?: number | null
          queue_metadata?: Json | null
          recipient_email: string
          scheduled_for: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          campaign_id?: string | null
          created_at?: string | null
          email_send_id?: string | null
          id?: string
          last_attempt_at?: string | null
          priority?: number | null
          queue_metadata?: Json | null
          recipient_email?: string
          scheduled_for?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bounce_reason: string | null
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string | null
          click_count: number | null
          clicked_at: string | null
          complained_at: string | null
          created_at: string | null
          delivered_at: string | null
          email_provider: string | null
          email_provider_data: Json | null
          email_provider_id: string | null
          error_code: string | null
          error_message: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          from_email: string | null
          id: string
          last_clicked_at: string | null
          last_opened_at: string | null
          links_clicked: string[] | null
          max_retries: number | null
          next_retry_at: string | null
          open_count: number | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string | null
          retry_count: number | null
          send_metadata: Json | null
          sent_at: string | null
          status: string | null
          subject: string
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          click_count?: number | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_provider?: string | null
          email_provider_data?: Json | null
          email_provider_id?: string | null
          error_code?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          from_email?: string | null
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          links_clicked?: string[] | null
          max_retries?: number | null
          next_retry_at?: string | null
          open_count?: number | null
          opened_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          retry_count?: number | null
          send_metadata?: Json | null
          sent_at?: string | null
          status?: string | null
          subject: string
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          click_count?: number | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_provider?: string | null
          email_provider_data?: Json | null
          email_provider_id?: string | null
          error_code?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          from_email?: string | null
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          links_clicked?: string[] | null
          max_retries?: number | null
          next_retry_at?: string | null
          open_count?: number | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          retry_count?: number | null
          send_metadata?: Json | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
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
      email_unsubscribes: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          reason: string | null
          reason_detail: string | null
          resubscribed_at: string | null
          unsubscribe_type: string | null
          unsubscribed_at: string | null
          unsubscribed_from_email_id: string | null
          unsubscribed_via: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          reason?: string | null
          reason_detail?: string | null
          resubscribed_at?: string | null
          unsubscribe_type?: string | null
          unsubscribed_at?: string | null
          unsubscribed_from_email_id?: string | null
          unsubscribed_via?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          reason?: string | null
          reason_detail?: string | null
          resubscribed_at?: string | null
          unsubscribe_type?: string | null
          unsubscribed_at?: string | null
          unsubscribed_from_email_id?: string | null
          unsubscribed_via?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_unsubscribed_from_email_id_fkey"
            columns: ["unsubscribed_from_email_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
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
          gps_coordinates: unknown
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
          gps_coordinates?: unknown
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
          gps_coordinates?: unknown
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
      equipment_inventory: {
        Row: {
          company_id: string
          created_at: string
          current_value: number | null
          equipment_type: string
          id: string
          location: string | null
          make: string | null
          model: string | null
          name: string
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          specifications: Json | null
          status: string
          updated_at: string
          year: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          current_value?: number | null
          equipment_type: string
          id?: string
          location?: string | null
          make?: string | null
          model?: string | null
          name: string
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          current_value?: number | null
          equipment_type?: string
          id?: string
          location?: string | null
          make?: string | null
          model?: string | null
          name?: string
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
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
      feature_announcements: {
        Row: {
          action_label: string | null
          action_url: string | null
          company_id: string | null
          content: string
          created_at: string
          created_by: string | null
          dismissals: number | null
          expires_at: string | null
          id: string
          image_url: string | null
          priority: string
          published_at: string | null
          show_as_popup: boolean | null
          show_in_dashboard: boolean | null
          status: string
          target_audience: string | null
          title: string
          type: string
          updated_at: string
          views: number | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          company_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          dismissals?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          priority?: string
          published_at?: string | null
          show_as_popup?: boolean | null
          show_in_dashboard?: boolean | null
          status?: string
          target_audience?: string | null
          title: string
          type?: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          company_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          dismissals?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          priority?: string
          published_at?: string | null
          show_as_popup?: boolean | null
          show_in_dashboard?: boolean | null
          status?: string
          target_audience?: string | null
          title?: string
          type?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          created_at: string | null
          feature_category: string | null
          feature_name: string
          first_used_at: string | null
          id: string
          last_used_at: string | null
          total_time_spent_minutes: number | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature_category?: string | null
          feature_name: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          total_time_spent_minutes?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature_category?: string | null
          feature_name?: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          total_time_spent_minutes?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      financial_snapshots: {
        Row: {
          accounts_payable: number | null
          accounts_receivable: number | null
          active_projects_count: number | null
          cash_on_hand: number | null
          completed_projects_count: number | null
          created_at: string | null
          gross_profit: number | null
          id: string
          labor_costs: number | null
          material_costs: number | null
          net_profit: number | null
          overhead_costs: number | null
          profit_margin: number | null
          revenue_mtd: number | null
          revenue_ytd: number | null
          snapshot_date: string
          tenant_id: string | null
          total_costs: number | null
          total_revenue: number | null
        }
        Insert: {
          accounts_payable?: number | null
          accounts_receivable?: number | null
          active_projects_count?: number | null
          cash_on_hand?: number | null
          completed_projects_count?: number | null
          created_at?: string | null
          gross_profit?: number | null
          id?: string
          labor_costs?: number | null
          material_costs?: number | null
          net_profit?: number | null
          overhead_costs?: number | null
          profit_margin?: number | null
          revenue_mtd?: number | null
          revenue_ytd?: number | null
          snapshot_date: string
          tenant_id?: string | null
          total_costs?: number | null
          total_revenue?: number | null
        }
        Update: {
          accounts_payable?: number | null
          accounts_receivable?: number | null
          active_projects_count?: number | null
          cash_on_hand?: number | null
          completed_projects_count?: number | null
          created_at?: string | null
          gross_profit?: number | null
          id?: string
          labor_costs?: number | null
          material_costs?: number | null
          net_profit?: number | null
          overhead_costs?: number | null
          profit_margin?: number | null
          revenue_mtd?: number | null
          revenue_ytd?: number | null
          snapshot_date?: string
          tenant_id?: string | null
          total_costs?: number | null
          total_revenue?: number | null
        }
        Relationships: []
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
      gdpr_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          data_types: string[] | null
          date_range_end: string | null
          date_range_start: string | null
          deadline: string | null
          export_expires_at: string | null
          export_url: string | null
          id: string
          is_overdue: boolean | null
          legal_basis: string | null
          reason: string | null
          request_type: string
          requester_email: string
          requester_name: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          data_types?: string[] | null
          date_range_end?: string | null
          date_range_start?: string | null
          deadline?: string | null
          export_expires_at?: string | null
          export_url?: string | null
          id?: string
          is_overdue?: boolean | null
          legal_basis?: string | null
          reason?: string | null
          request_type: string
          requester_email: string
          requester_name?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          data_types?: string[] | null
          date_range_end?: string | null
          date_range_start?: string | null
          deadline?: string | null
          export_expires_at?: string | null
          export_url?: string | null
          id?: string
          is_overdue?: boolean | null
          legal_basis?: string | null
          reason?: string | null
          request_type?: string
          requester_email?: string
          requester_name?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          address: string | null
          alert_on_breach: boolean | null
          alert_on_entry: boolean | null
          alert_on_exit: boolean | null
          allowed_clock_in_times: Json | null
          allowed_roles: string[] | null
          allowed_users: string[] | null
          auto_clock_in: boolean | null
          auto_clock_out: boolean | null
          center_lat: number
          center_lng: number
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          description: string | null
          geofence_type: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          polygon_coordinates: Json | null
          project_id: string | null
          radius_meters: number
          state: string | null
          tenant_id: string | null
          total_breaches: number | null
          total_clock_ins: number | null
          total_clock_outs: number | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          alert_on_breach?: boolean | null
          alert_on_entry?: boolean | null
          alert_on_exit?: boolean | null
          allowed_clock_in_times?: Json | null
          allowed_roles?: string[] | null
          allowed_users?: string[] | null
          auto_clock_in?: boolean | null
          auto_clock_out?: boolean | null
          center_lat: number
          center_lng: number
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          geofence_type?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          polygon_coordinates?: Json | null
          project_id?: string | null
          radius_meters: number
          state?: string | null
          tenant_id?: string | null
          total_breaches?: number | null
          total_clock_ins?: number | null
          total_clock_outs?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          alert_on_breach?: boolean | null
          alert_on_entry?: boolean | null
          alert_on_exit?: boolean | null
          allowed_clock_in_times?: Json | null
          allowed_roles?: string[] | null
          allowed_users?: string[] | null
          auto_clock_in?: boolean | null
          auto_clock_out?: boolean | null
          center_lat?: number
          center_lng?: number
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          geofence_type?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          polygon_coordinates?: Json | null
          project_id?: string | null
          radius_meters?: number
          state?: string | null
          tenant_id?: string | null
          total_breaches?: number | null
          total_clock_ins?: number | null
          total_clock_outs?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geofences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "geofences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_locations: {
        Row: {
          accuracy: number | null
          altitude: number | null
          company_id: string
          created_at: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          project_id: string | null
          speed: number | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          company_id: string
          created_at?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          project_id?: string | null
          speed?: number | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          company_id?: string
          created_at?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          project_id?: string | null
          speed?: number | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "gps_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_time_entries: {
        Row: {
          adjusted_by: string | null
          adjustment_reason: string | null
          adjustment_timestamp: string | null
          clock_in_accuracy: number | null
          clock_in_address: string | null
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_in_timestamp: string
          clock_out_accuracy: number | null
          clock_out_address: string | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          clock_out_timestamp: string | null
          created_at: string | null
          device_id: string | null
          device_type: string | null
          geofence_breach_alert: boolean | null
          geofence_distance_meters: number | null
          geofence_id: string | null
          gps_provider: string | null
          id: string
          is_manually_adjusted: boolean | null
          is_stationary: boolean | null
          is_within_geofence: boolean | null
          location_tracking_enabled: boolean | null
          location_update_interval_minutes: number | null
          metadata: Json | null
          project_id: string | null
          requires_review: boolean | null
          review_reason: string | null
          tenant_id: string | null
          time_entry_id: string | null
          total_distance_meters: number | null
          total_locations_captured: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_reason?: string | null
          adjustment_timestamp?: string | null
          clock_in_accuracy?: number | null
          clock_in_address?: string | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_timestamp: string
          clock_out_accuracy?: number | null
          clock_out_address?: string | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_timestamp?: string | null
          created_at?: string | null
          device_id?: string | null
          device_type?: string | null
          geofence_breach_alert?: boolean | null
          geofence_distance_meters?: number | null
          geofence_id?: string | null
          gps_provider?: string | null
          id?: string
          is_manually_adjusted?: boolean | null
          is_stationary?: boolean | null
          is_within_geofence?: boolean | null
          location_tracking_enabled?: boolean | null
          location_update_interval_minutes?: number | null
          metadata?: Json | null
          project_id?: string | null
          requires_review?: boolean | null
          review_reason?: string | null
          tenant_id?: string | null
          time_entry_id?: string | null
          total_distance_meters?: number | null
          total_locations_captured?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adjusted_by?: string | null
          adjustment_reason?: string | null
          adjustment_timestamp?: string | null
          clock_in_accuracy?: number | null
          clock_in_address?: string | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_timestamp?: string
          clock_out_accuracy?: number | null
          clock_out_address?: string | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_timestamp?: string | null
          created_at?: string | null
          device_id?: string | null
          device_type?: string | null
          geofence_breach_alert?: boolean | null
          geofence_distance_meters?: number | null
          geofence_id?: string | null
          gps_provider?: string | null
          id?: string
          is_manually_adjusted?: boolean | null
          is_stationary?: boolean | null
          is_within_geofence?: boolean | null
          location_tracking_enabled?: boolean | null
          location_update_interval_minutes?: number | null
          metadata?: Json | null
          project_id?: string | null
          requires_review?: boolean | null
          review_reason?: string | null
          tenant_id?: string | null
          time_entry_id?: string | null
          total_distance_meters?: number | null
          total_locations_captured?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "gps_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_time_entries_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
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
      inspection_schedules: {
        Row: {
          company_id: string
          completion_date: string | null
          created_at: string
          id: string
          inspection_type: string
          inspector_contact: string | null
          inspector_name: string | null
          notes: string | null
          project_id: string
          required_documentation: Json | null
          scheduled_date: string
          status: string | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          completion_date?: string | null
          created_at?: string
          id?: string
          inspection_type: string
          inspector_contact?: string | null
          inspector_name?: string | null
          notes?: string | null
          project_id: string
          required_documentation?: Json | null
          scheduled_date: string
          status?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          completion_date?: string | null
          created_at?: string
          id?: string
          inspection_type?: string
          inspector_contact?: string | null
          inspector_name?: string | null
          notes?: string | null
          project_id?: string
          required_documentation?: Json | null
          scheduled_date?: string
          status?: string | null
          task_id?: string | null
          updated_at?: string
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
      integration_apps: {
        Row: {
          api_docs_url: string | null
          auth_type: string
          average_rating: number | null
          category: string
          created_at: string | null
          description: string | null
          features: string[] | null
          id: string
          install_count: number | null
          is_active: boolean | null
          is_beta: boolean | null
          is_premium: boolean | null
          logo_url: string | null
          name: string
          oauth_authorize_url: string | null
          oauth_scopes: string[] | null
          oauth_token_url: string | null
          slug: string
          supports_two_way_sync: boolean | null
          supports_webhooks: boolean | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          api_docs_url?: string | null
          auth_type: string
          average_rating?: number | null
          category: string
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          install_count?: number | null
          is_active?: boolean | null
          is_beta?: boolean | null
          is_premium?: boolean | null
          logo_url?: string | null
          name: string
          oauth_authorize_url?: string | null
          oauth_scopes?: string[] | null
          oauth_token_url?: string | null
          slug: string
          supports_two_way_sync?: boolean | null
          supports_webhooks?: boolean | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          api_docs_url?: string | null
          auth_type?: string
          average_rating?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          install_count?: number | null
          is_active?: boolean | null
          is_beta?: boolean | null
          is_premium?: boolean | null
          logo_url?: string | null
          name?: string
          oauth_authorize_url?: string | null
          oauth_scopes?: string[] | null
          oauth_token_url?: string | null
          slug?: string
          supports_two_way_sync?: boolean | null
          supports_webhooks?: boolean | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
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
      integration_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          integration_id: string
          records_created: number | null
          records_deleted: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string
          sync_direction: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id: string
          records_created?: number | null
          records_deleted?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status: string
          sync_direction: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id?: string
          records_created?: number | null
          records_deleted?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          sync_direction?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhooks: {
        Row: {
          created_at: string | null
          event_types: string[]
          failure_count: number | null
          id: string
          integration_id: string
          is_active: boolean | null
          last_failure_at: string | null
          last_success_at: string | null
          last_triggered_at: string | null
          success_count: number | null
          trigger_count: number | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          event_types: string[]
          failure_count?: number | null
          id?: string
          integration_id: string
          is_active?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          success_count?: number | null
          trigger_count?: number | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          event_types?: string[]
          failure_count?: number | null
          id?: string
          integration_id?: string
          is_active?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          success_count?: number | null
          trigger_count?: number | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhooks_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_optimizations: {
        Row: {
          applied_at: string | null
          company_id: string
          cost_savings_potential: number | null
          created_at: string
          current_stock_level: number | null
          id: string
          material_name: string
          optimal_stock_level: number
          optimization_recommendations: Json | null
          project_id: string | null
          reorder_point: number
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          company_id: string
          cost_savings_potential?: number | null
          created_at?: string
          current_stock_level?: number | null
          id?: string
          material_name: string
          optimal_stock_level: number
          optimization_recommendations?: Json | null
          project_id?: string | null
          reorder_point: number
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          company_id?: string
          cost_savings_potential?: number | null
          created_at?: string
          current_stock_level?: number | null
          id?: string
          material_name?: string
          optimal_stock_level?: number
          optimization_recommendations?: Json | null
          project_id?: string | null
          reorder_point?: number
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
          line_total: number | null
          project_phase_id: string | null
          quantity: number
          total_price: number | null
          unit_price: number
          work_completed_percentage: number | null
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number | null
          project_phase_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_price: number
          work_completed_percentage?: number | null
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          project_phase_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_price?: number
          work_completed_percentage?: number | null
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
          client_address: string | null
          client_email: string | null
          client_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_amount_due: number | null
          discount_amount: number | null
          due_date: string
          id: string
          invoice_date: string | null
          invoice_number: string
          invoice_type: string | null
          issue_date: string
          last_synced_to_qb: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          po_number: string | null
          previous_amount_billed: number | null
          progress_percentage: number | null
          project_id: string | null
          qb_invoice_id: string | null
          qb_sync_token: string | null
          reference_number: string | null
          retention_amount: number | null
          retention_due_date: string | null
          retention_percentage: number | null
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
          viewed_at: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_amount_due?: number | null
          discount_amount?: number | null
          due_date: string
          id?: string
          invoice_date?: string | null
          invoice_number: string
          invoice_type?: string | null
          issue_date?: string
          last_synced_to_qb?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          po_number?: string | null
          previous_amount_billed?: number | null
          progress_percentage?: number | null
          project_id?: string | null
          qb_invoice_id?: string | null
          qb_sync_token?: string | null
          reference_number?: string | null
          retention_amount?: number | null
          retention_due_date?: string | null
          retention_percentage?: number | null
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
          viewed_at?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_amount_due?: number | null
          discount_amount?: number | null
          due_date?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          invoice_type?: string | null
          issue_date?: string
          last_synced_to_qb?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          po_number?: string | null
          previous_amount_billed?: number | null
          progress_percentage?: number | null
          project_id?: string | null
          qb_invoice_id?: string | null
          qb_sync_token?: string | null
          reference_number?: string | null
          retention_amount?: number | null
          retention_due_date?: string | null
          retention_percentage?: number | null
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
          viewed_at?: string | null
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
          ip_range: unknown
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
          ip_range?: unknown
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
          ip_range?: unknown
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
      job_costing_summary: {
        Row: {
          equipment_actual: number | null
          equipment_budgeted: number | null
          id: string
          labor_actual: number | null
          labor_budgeted: number | null
          last_updated: string
          materials_actual: number | null
          materials_budgeted: number | null
          overhead_actual: number | null
          overhead_budgeted: number | null
          profit_margin_percentage: number | null
          project_id: string
          subcontractors_actual: number | null
          subcontractors_budgeted: number | null
          total_actual: number | null
          total_budgeted: number | null
          total_variance: number | null
          variance_percentage: number | null
        }
        Insert: {
          equipment_actual?: number | null
          equipment_budgeted?: number | null
          id?: string
          labor_actual?: number | null
          labor_budgeted?: number | null
          last_updated?: string
          materials_actual?: number | null
          materials_budgeted?: number | null
          overhead_actual?: number | null
          overhead_budgeted?: number | null
          profit_margin_percentage?: number | null
          project_id: string
          subcontractors_actual?: number | null
          subcontractors_budgeted?: number | null
          total_actual?: number | null
          total_budgeted?: number | null
          total_variance?: number | null
          variance_percentage?: number | null
        }
        Update: {
          equipment_actual?: number | null
          equipment_budgeted?: number | null
          id?: string
          labor_actual?: number | null
          labor_budgeted?: number | null
          last_updated?: string
          materials_actual?: number | null
          materials_budgeted?: number | null
          overhead_actual?: number | null
          overhead_budgeted?: number | null
          profit_margin_percentage?: number | null
          project_id?: string
          subcontractors_actual?: number | null
          subcontractors_budgeted?: number | null
          total_actual?: number | null
          total_budgeted?: number | null
          total_variance?: number | null
          variance_percentage?: number | null
        }
        Relationships: []
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
      keyword_research_data: {
        Row: {
          blog_generation_count: number | null
          category: string | null
          company_id: string
          cpc: number | null
          created_at: string
          current_rank: number | null
          difficulty: number | null
          id: string
          keyword: string
          last_used_for_blog: string | null
          priority: string | null
          search_intent: string | null
          search_volume: number | null
          selected_for_blog_generation: boolean | null
          target_rank: number | null
          updated_at: string
          used_for_blog_generation: boolean | null
        }
        Insert: {
          blog_generation_count?: number | null
          category?: string | null
          company_id: string
          cpc?: number | null
          created_at?: string
          current_rank?: number | null
          difficulty?: number | null
          id?: string
          keyword: string
          last_used_for_blog?: string | null
          priority?: string | null
          search_intent?: string | null
          search_volume?: number | null
          selected_for_blog_generation?: boolean | null
          target_rank?: number | null
          updated_at?: string
          used_for_blog_generation?: boolean | null
        }
        Update: {
          blog_generation_count?: number | null
          category?: string | null
          company_id?: string
          cpc?: number | null
          created_at?: string
          current_rank?: number | null
          difficulty?: number | null
          id?: string
          keyword?: string
          last_used_for_blog?: string | null
          priority?: string | null
          search_intent?: string | null
          search_volume?: number | null
          selected_for_blog_generation?: boolean | null
          target_rank?: number | null
          updated_at?: string
          used_for_blog_generation?: boolean | null
        }
        Relationships: []
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
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          article_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          article_id?: string
          id?: string
          ip_address?: unknown
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
      kpi_metrics: {
        Row: {
          change_percentage: number | null
          created_at: string | null
          id: string
          metric_date: string
          metric_name: string
          metric_target: number | null
          metric_value: number
          previous_value: number | null
          tenant_id: string | null
          trend: string | null
        }
        Insert: {
          change_percentage?: number | null
          created_at?: string | null
          id?: string
          metric_date: string
          metric_name: string
          metric_target?: number | null
          metric_value: number
          previous_value?: number | null
          tenant_id?: string | null
          trend?: string | null
        }
        Update: {
          change_percentage?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          metric_name?: string
          metric_target?: number | null
          metric_value?: number
          previous_value?: number | null
          tenant_id?: string | null
          trend?: string | null
        }
        Relationships: []
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
      labor_costs: {
        Row: {
          burden_rate: number | null
          cost_code_id: string | null
          created_at: string
          description: string | null
          employee_id: string | null
          employee_name: string | null
          hourly_rate: number
          hours_worked: number
          id: string
          overtime_hours: number | null
          overtime_rate: number | null
          project_id: string
          total_cost_with_burden: number
          total_labor_cost: number
          updated_at: string
          work_date: string
        }
        Insert: {
          burden_rate?: number | null
          cost_code_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          employee_name?: string | null
          hourly_rate: number
          hours_worked: number
          id?: string
          overtime_hours?: number | null
          overtime_rate?: number | null
          project_id: string
          total_cost_with_burden: number
          total_labor_cost: number
          updated_at?: string
          work_date: string
        }
        Update: {
          burden_rate?: number | null
          cost_code_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          employee_name?: string | null
          hourly_rate?: number
          hours_worked?: number
          id?: string
          overtime_hours?: number | null
          overtime_rate?: number | null
          project_id?: string
          total_cost_with_burden?: number
          total_labor_cost?: number
          updated_at?: string
          work_date?: string
        }
        Relationships: []
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
          activity_data: Json | null
          activity_type: string
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          lead_id: string | null
          page_url: string | null
          user_agent: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          lead_id?: string | null
          page_url?: string | null
          user_agent?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          lead_id?: string | null
          page_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          annual_revenue: string | null
          assigned_at: string | null
          assigned_to: string | null
          company_name: string | null
          company_size: string | null
          conversion_value: number | null
          converted_at: string | null
          converted_to_user_id: string | null
          created_at: string | null
          decision_maker: boolean | null
          decision_timeline: string | null
          demo_scheduled_at: string | null
          downloaded_resource: boolean | null
          email: string
          estimated_budget: number | null
          financing_secured: boolean | null
          first_name: string | null
          first_seen_at: string | null
          id: string
          industry: string | null
          interest_type: string | null
          job_title: string | null
          landing_page: string | null
          last_activity_at: string | null
          last_contact_date: string | null
          last_name: string | null
          lead_score: number | null
          lead_source: string | null
          lead_status: string | null
          lead_temperature: string | null
          next_follow_up_date: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          project_name: string | null
          project_type: string | null
          referrer: string | null
          requested_demo: boolean | null
          requested_sales_contact: boolean | null
          started_signup: boolean | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewed_pricing: boolean | null
        }
        Insert: {
          annual_revenue?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          company_name?: string | null
          company_size?: string | null
          conversion_value?: number | null
          converted_at?: string | null
          converted_to_user_id?: string | null
          created_at?: string | null
          decision_maker?: boolean | null
          decision_timeline?: string | null
          demo_scheduled_at?: string | null
          downloaded_resource?: boolean | null
          email: string
          estimated_budget?: number | null
          financing_secured?: boolean | null
          first_name?: string | null
          first_seen_at?: string | null
          id?: string
          industry?: string | null
          interest_type?: string | null
          job_title?: string | null
          landing_page?: string | null
          last_activity_at?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lead_status?: string | null
          lead_temperature?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          project_name?: string | null
          project_type?: string | null
          referrer?: string | null
          requested_demo?: boolean | null
          requested_sales_contact?: boolean | null
          started_signup?: boolean | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewed_pricing?: boolean | null
        }
        Update: {
          annual_revenue?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          company_name?: string | null
          company_size?: string | null
          conversion_value?: number | null
          converted_at?: string | null
          converted_to_user_id?: string | null
          created_at?: string | null
          decision_maker?: boolean | null
          decision_timeline?: string | null
          demo_scheduled_at?: string | null
          downloaded_resource?: boolean | null
          email?: string
          estimated_budget?: number | null
          financing_secured?: boolean | null
          first_name?: string | null
          first_seen_at?: string | null
          id?: string
          industry?: string | null
          interest_type?: string | null
          job_title?: string | null
          landing_page?: string | null
          last_activity_at?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lead_status?: string | null
          lead_temperature?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          project_name?: string | null
          project_type?: string | null
          referrer?: string | null
          requested_demo?: boolean | null
          requested_sales_contact?: boolean | null
          started_signup?: boolean | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewed_pricing?: boolean | null
        }
        Relationships: []
      }
      location_history: {
        Row: {
          accuracy: number | null
          activity_type: string | null
          address: string | null
          altitude: number | null
          battery_level: number | null
          captured_at: string
          city: string | null
          created_at: string | null
          device_type: string | null
          distance_to_geofence: number | null
          geofence_id: string | null
          gps_provider: string | null
          gps_time_entry_id: string | null
          heading: number | null
          id: string
          is_background_capture: boolean | null
          is_within_geofence: boolean | null
          latitude: number
          longitude: number
          metadata: Json | null
          project_id: string | null
          speed: number | null
          state: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          activity_type?: string | null
          address?: string | null
          altitude?: number | null
          battery_level?: number | null
          captured_at?: string
          city?: string | null
          created_at?: string | null
          device_type?: string | null
          distance_to_geofence?: number | null
          geofence_id?: string | null
          gps_provider?: string | null
          gps_time_entry_id?: string | null
          heading?: number | null
          id?: string
          is_background_capture?: boolean | null
          is_within_geofence?: boolean | null
          latitude: number
          longitude: number
          metadata?: Json | null
          project_id?: string | null
          speed?: number | null
          state?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          activity_type?: string | null
          address?: string | null
          altitude?: number | null
          battery_level?: number | null
          captured_at?: string
          city?: string | null
          created_at?: string | null
          device_type?: string | null
          distance_to_geofence?: number | null
          geofence_id?: string | null
          gps_provider?: string | null
          gps_time_entry_id?: string | null
          heading?: number | null
          id?: string
          is_background_capture?: boolean | null
          is_within_geofence?: boolean | null
          latitude?: number
          longitude?: number
          metadata?: Json | null
          project_id?: string | null
          speed?: number | null
          state?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_history_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_history_gps_time_entry_id_fkey"
            columns: ["gps_time_entry_id"]
            isOneToOne: false
            referencedRelation: "gps_time_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "location_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          company_id: string
          cost: number | null
          created_at: string
          description: string | null
          equipment_id: string | null
          hours_spent: number | null
          id: string
          maintenance_date: string
          maintenance_type: string
          next_due_date: string | null
          notes: string | null
          parts_used: Json | null
          performed_by: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          hours_spent?: number | null
          id?: string
          maintenance_date: string
          maintenance_type: string
          next_due_date?: string | null
          notes?: string | null
          parts_used?: Json | null
          performed_by?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          hours_spent?: number | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          next_due_date?: string | null
          notes?: string | null
          parts_used?: Json | null
          performed_by?: string | null
          updated_at?: string
        }
        Relationships: []
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
      material_delivery_plans: {
        Row: {
          company_id: string
          created_at: string
          delivery_address: string | null
          delivery_date: string
          delivery_status: string | null
          id: string
          material_name: string
          project_id: string | null
          quantity: number
          received_date: string | null
          received_quantity: number | null
          special_instructions: string | null
          supplier_name: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delivery_address?: string | null
          delivery_date: string
          delivery_status?: string | null
          id?: string
          material_name: string
          project_id?: string | null
          quantity: number
          received_date?: string | null
          received_quantity?: number | null
          special_instructions?: string | null
          supplier_name: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delivery_address?: string | null
          delivery_date?: string
          delivery_status?: string | null
          id?: string
          material_name?: string
          project_id?: string | null
          quantity?: number
          received_date?: string | null
          received_quantity?: number | null
          special_instructions?: string | null
          supplier_name?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      material_forecasts: {
        Row: {
          based_on_projects_count: number | null
          confidence_score: number | null
          created_at: string | null
          estimated_lead_time_days: number | null
          forecast_date: string
          forecast_quantity: number
          forecast_unit: string
          id: string
          material_category: string | null
          material_name: string
          project_id: string | null
          recommended_order_date: string | null
          tenant_id: string | null
        }
        Insert: {
          based_on_projects_count?: number | null
          confidence_score?: number | null
          created_at?: string | null
          estimated_lead_time_days?: number | null
          forecast_date: string
          forecast_quantity: number
          forecast_unit: string
          id?: string
          material_category?: string | null
          material_name: string
          project_id?: string | null
          recommended_order_date?: string | null
          tenant_id?: string | null
        }
        Update: {
          based_on_projects_count?: number | null
          confidence_score?: number | null
          created_at?: string | null
          estimated_lead_time_days?: number | null
          forecast_date?: string
          forecast_quantity?: number
          forecast_unit?: string
          id?: string
          material_category?: string | null
          material_name?: string
          project_id?: string | null
          recommended_order_date?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      material_items: {
        Row: {
          category: string
          company_id: string
          created_at: string
          current_cost: number
          description: string | null
          id: string
          last_updated: string
          name: string
          sku: string | null
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          current_cost?: number
          description?: string | null
          id?: string
          last_updated?: string
          name: string
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          current_cost?: number
          description?: string | null
          id?: string
          last_updated?: string
          name?: string
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_material_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      material_shortages: {
        Row: {
          company_id: string
          created_at: string
          current_quantity: number | null
          estimated_resolution_date: string | null
          id: string
          material_name: string
          project_id: string | null
          required_quantity: number
          resolution_plan: string | null
          severity: string | null
          shortage_date: string
          shortage_quantity: number
          status: string | null
          supplier_contact: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_quantity?: number | null
          estimated_resolution_date?: string | null
          id?: string
          material_name: string
          project_id?: string | null
          required_quantity: number
          resolution_plan?: string | null
          severity?: string | null
          shortage_date: string
          shortage_quantity: number
          status?: string | null
          supplier_contact?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_quantity?: number | null
          estimated_resolution_date?: string | null
          id?: string
          material_name?: string
          project_id?: string | null
          required_quantity?: number
          resolution_plan?: string | null
          severity?: string | null
          shortage_date?: string
          shortage_quantity?: number
          status?: string | null
          supplier_contact?: string | null
          updated_at?: string
        }
        Relationships: []
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
      material_usage_predictions: {
        Row: {
          accuracy_score: number | null
          actual_usage: number | null
          based_on_data: Json | null
          company_id: string
          confidence_level: number | null
          created_at: string
          id: string
          material_name: string
          predicted_usage: number
          prediction_date: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          accuracy_score?: number | null
          actual_usage?: number | null
          based_on_data?: Json | null
          company_id: string
          confidence_level?: number | null
          created_at?: string
          id?: string
          material_name: string
          predicted_usage: number
          prediction_date: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          accuracy_score?: number | null
          actual_usage?: number | null
          based_on_data?: Json | null
          company_id?: string
          confidence_level?: number | null
          created_at?: string
          id?: string
          material_name?: string
          predicted_usage?: number
          prediction_date?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      mfa_devices: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_enabled: boolean | null
          is_verified: boolean | null
          last_used_at: string | null
          mfa_type: string
          phone_number: string | null
          recovery_codes: string[] | null
          secret: string | null
          total_uses: number | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_enabled?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          mfa_type: string
          phone_number?: string | null
          recovery_codes?: string[] | null
          secret?: string | null
          total_uses?: number | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_enabled?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          mfa_type?: string
          phone_number?: string | null
          recovery_codes?: string[] | null
          secret?: string | null
          total_uses?: number | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
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
      onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          tasks_completed: string[] | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          tasks_completed?: string[] | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          tasks_completed?: string[] | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      osha_300_log: {
        Row: {
          body_part_affected: string | null
          created_at: string | null
          days_away_from_work: number | null
          days_of_job_transfer: number | null
          days_of_restricted_work: number | null
          employee_id: string | null
          employee_name: string
          id: string
          incident_date: string
          incident_description: string
          incident_location: string
          incident_time: string | null
          injury_type: string
          is_privacy_case: boolean | null
          job_title: string | null
          project_id: string | null
          reported_at: string | null
          reported_to_osha: boolean | null
          return_to_work_date: string | null
          severity: string | null
          tenant_id: string
          treatment_provided: string | null
          updated_at: string | null
        }
        Insert: {
          body_part_affected?: string | null
          created_at?: string | null
          days_away_from_work?: number | null
          days_of_job_transfer?: number | null
          days_of_restricted_work?: number | null
          employee_id?: string | null
          employee_name: string
          id?: string
          incident_date: string
          incident_description: string
          incident_location: string
          incident_time?: string | null
          injury_type: string
          is_privacy_case?: boolean | null
          job_title?: string | null
          project_id?: string | null
          reported_at?: string | null
          reported_to_osha?: boolean | null
          return_to_work_date?: string | null
          severity?: string | null
          tenant_id: string
          treatment_provided?: string | null
          updated_at?: string | null
        }
        Update: {
          body_part_affected?: string | null
          created_at?: string | null
          days_away_from_work?: number | null
          days_of_job_transfer?: number | null
          days_of_restricted_work?: number | null
          employee_id?: string | null
          employee_name?: string
          id?: string
          incident_date?: string
          incident_description?: string
          incident_location?: string
          incident_time?: string | null
          injury_type?: string
          is_privacy_case?: boolean | null
          job_title?: string | null
          project_id?: string | null
          reported_at?: string | null
          reported_to_osha?: boolean | null
          return_to_work_date?: string | null
          severity?: string | null
          tenant_id?: string
          treatment_provided?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "osha_300_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "osha_300_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osha_300_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      payment_applications: {
        Row: {
          application_number: string
          approved_date: string | null
          company_id: string
          created_at: string
          current_payment_due: number
          id: string
          less_previous_payments: number
          materials_stored: number
          paid_date: string | null
          period_ending: string
          project_id: string | null
          retention_amount: number
          retention_percentage: number | null
          status: string
          submitted_date: string | null
          total_earned: number
          updated_at: string
          work_completed_to_date: number
        }
        Insert: {
          application_number: string
          approved_date?: string | null
          company_id: string
          created_at?: string
          current_payment_due?: number
          id?: string
          less_previous_payments?: number
          materials_stored?: number
          paid_date?: string | null
          period_ending: string
          project_id?: string | null
          retention_amount?: number
          retention_percentage?: number | null
          status?: string
          submitted_date?: string | null
          total_earned?: number
          updated_at?: string
          work_completed_to_date?: number
        }
        Update: {
          application_number?: string
          approved_date?: string | null
          company_id?: string
          created_at?: string
          current_payment_due?: number
          id?: string
          less_previous_payments?: number
          materials_stored?: number
          paid_date?: string | null
          period_ending?: string
          project_id?: string | null
          retention_amount?: number
          retention_percentage?: number | null
          status?: string
          submitted_date?: string | null
          total_earned?: number
          updated_at?: string
          work_completed_to_date?: number
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
      payment_reminders: {
        Row: {
          created_at: string | null
          days_before_after: number | null
          delivery_method: string | null
          id: string
          invoice_id: string | null
          project_id: string | null
          reminder_type: string | null
          sent_at: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          days_before_after?: number | null
          delivery_method?: string | null
          id?: string
          invoice_id?: string | null
          project_id?: string | null
          reminder_type?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          days_before_after?: number | null
          delivery_method?: string | null
          id?: string
          invoice_id?: string | null
          project_id?: string | null
          reminder_type?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: []
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
          gps_coordinates: unknown
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
          gps_coordinates?: unknown
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
          gps_coordinates?: unknown
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
      ppe_tracking: {
        Row: {
          assigned_date: string
          condition_status: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          item_description: string | null
          last_inspection_date: string | null
          next_inspection_date: string | null
          ppe_type: string
          replacement_due_date: string | null
          returned_date: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          assigned_date: string
          condition_status?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_description?: string | null
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          ppe_type: string
          replacement_due_date?: string | null
          returned_date?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          assigned_date?: string
          condition_status?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_description?: string | null
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          ppe_type?: string
          replacement_due_date?: string | null
          returned_date?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppe_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          crm_contact_id: string | null
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
          crm_contact_id?: string | null
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
          crm_contact_id?: string | null
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
            foreignKeyName: "project_contacts_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
      project_photos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          project_id: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          project_id: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          project_id?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
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
          created_from: string | null
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          geofence_radius_meters: number | null
          id: string
          name: string
          opportunity_id: string | null
          permit_numbers: string[] | null
          profit_margin: number | null
          project_manager_id: string | null
          project_type: string | null
          site_address: string | null
          site_latitude: number | null
          site_longitude: number | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          total_budget: number | null
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
          created_from?: string | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          geofence_radius_meters?: number | null
          id?: string
          name: string
          opportunity_id?: string | null
          permit_numbers?: string[] | null
          profit_margin?: number | null
          project_manager_id?: string | null
          project_type?: string | null
          site_address?: string | null
          site_latitude?: number | null
          site_longitude?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          total_budget?: number | null
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
          created_from?: string | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          geofence_radius_meters?: number | null
          id?: string
          name?: string
          opportunity_id?: string | null
          permit_numbers?: string[] | null
          profit_margin?: number | null
          project_manager_id?: string | null
          project_type?: string | null
          site_address?: string | null
          site_latitude?: number | null
          site_longitude?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          total_budget?: number | null
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
          {
            foreignKeyName: "projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      purchase_recommendations: {
        Row: {
          created_at: string | null
          estimated_cost: number | null
          estimated_savings: number | null
          expected_delivery_date: string | null
          id: string
          material_name: string
          project_id: string | null
          recommended_order_date: string
          recommended_quantity: number
          recommended_supplier_id: string | null
          recommended_unit: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_cost?: number | null
          estimated_savings?: number | null
          expected_delivery_date?: string | null
          id?: string
          material_name: string
          project_id?: string | null
          recommended_order_date: string
          recommended_quantity: number
          recommended_supplier_id?: string | null
          recommended_unit: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_cost?: number | null
          estimated_savings?: number | null
          expected_delivery_date?: string | null
          id?: string
          material_name?: string
          project_id?: string | null
          recommended_order_date?: string
          recommended_quantity?: number
          recommended_supplier_id?: string | null
          recommended_unit?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_recommendations_recommended_supplier_id_fkey"
            columns: ["recommended_supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_catalog"
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
      quality_metrics_summary: {
        Row: {
          analysis_date: string
          average_quality_score: number | null
          company_id: string
          cost_impact_total: number | null
          created_at: string
          high_severity_defects: number | null
          id: string
          progress_variance: number | null
          project_id: string
          recommendations: Json | null
          safety_compliance_score: number | null
          time_impact_days: number | null
          total_defects_detected: number | null
          total_inspections: number | null
          trends: Json | null
          updated_at: string
        }
        Insert: {
          analysis_date?: string
          average_quality_score?: number | null
          company_id: string
          cost_impact_total?: number | null
          created_at?: string
          high_severity_defects?: number | null
          id?: string
          progress_variance?: number | null
          project_id: string
          recommendations?: Json | null
          safety_compliance_score?: number | null
          time_impact_days?: number | null
          total_defects_detected?: number | null
          total_inspections?: number | null
          trends?: Json | null
          updated_at?: string
        }
        Update: {
          analysis_date?: string
          average_quality_score?: number | null
          company_id?: string
          cost_impact_total?: number | null
          created_at?: string
          high_severity_defects?: number | null
          id?: string
          progress_variance?: number | null
          project_id?: string
          recommendations?: Json | null
          safety_compliance_score?: number | null
          time_impact_days?: number | null
          total_defects_detected?: number | null
          total_inspections?: number | null
          trends?: Json | null
          updated_at?: string
        }
        Relationships: []
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          referee_reward_amount: number | null
          referee_reward_duration: number | null
          referee_reward_type: string | null
          referrer_reward_amount: number | null
          referrer_reward_duration: number | null
          referrer_reward_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          referee_reward_amount?: number | null
          referee_reward_duration?: number | null
          referee_reward_type?: string | null
          referrer_reward_amount?: number | null
          referrer_reward_duration?: number | null
          referrer_reward_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          referee_reward_amount?: number | null
          referee_reward_duration?: number | null
          referee_reward_type?: string | null
          referrer_reward_amount?: number | null
          referrer_reward_duration?: number | null
          referrer_reward_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          referral_id: string | null
          reward_amount: number
          reward_currency: string | null
          reward_type: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          referral_id?: string | null
          reward_amount: number
          reward_currency?: string | null
          reward_type: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          referral_id?: string | null
          reward_amount?: number
          reward_currency?: string | null
          reward_type?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          converted_to_paid: boolean | null
          created_at: string | null
          id: string
          referee_email: string
          referee_name: string | null
          referee_reward_amount: number | null
          referee_reward_date: string | null
          referee_rewarded: boolean | null
          referee_user_id: string | null
          referral_code_id: string
          referral_date: string | null
          referrer_reward_amount: number | null
          referrer_reward_date: string | null
          referrer_rewarded: boolean | null
          referrer_user_id: string
          signup_date: string | null
          status: string | null
          trial_start_date: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          converted_at?: string | null
          converted_to_paid?: boolean | null
          created_at?: string | null
          id?: string
          referee_email: string
          referee_name?: string | null
          referee_reward_amount?: number | null
          referee_reward_date?: string | null
          referee_rewarded?: boolean | null
          referee_user_id?: string | null
          referral_code_id: string
          referral_date?: string | null
          referrer_reward_amount?: number | null
          referrer_reward_date?: string | null
          referrer_rewarded?: boolean | null
          referrer_user_id: string
          signup_date?: string | null
          status?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          converted_at?: string | null
          converted_to_paid?: boolean | null
          created_at?: string | null
          id?: string
          referee_email?: string
          referee_name?: string | null
          referee_reward_amount?: number | null
          referee_reward_date?: string | null
          referee_rewarded?: boolean | null
          referee_user_id?: string | null
          referral_code_id?: string
          referral_date?: string | null
          referrer_reward_amount?: number | null
          referrer_reward_date?: string | null
          referrer_rewarded?: boolean | null
          referrer_user_id?: string
          signup_date?: string | null
          status?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
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
      report_history: {
        Row: {
          custom_report_id: string
          delivered_to: string[] | null
          delivery_status: string | null
          execution_time_ms: number | null
          file_size_bytes: number | null
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          output_format: string | null
        }
        Insert: {
          custom_report_id: string
          delivered_to?: string[] | null
          delivery_status?: string | null
          execution_time_ms?: number | null
          file_size_bytes?: number | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          output_format?: string | null
        }
        Update: {
          custom_report_id?: string
          delivered_to?: string[] | null
          delivery_status?: string | null
          execution_time_ms?: number | null
          file_size_bytes?: number | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          output_format?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_history_custom_report_id_fkey"
            columns: ["custom_report_id"]
            isOneToOne: false
            referencedRelation: "custom_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string | null
          custom_report_id: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          schedule_day_of_month: number | null
          schedule_day_of_week: number | null
          schedule_time: string | null
        }
        Insert: {
          created_at?: string | null
          custom_report_id: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_time?: string | null
        }
        Update: {
          created_at?: string | null
          custom_report_id?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_custom_report_id_fkey"
            columns: ["custom_report_id"]
            isOneToOne: false
            referencedRelation: "custom_reports"
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
      retention_items: {
        Row: {
          actual_release_date: string | null
          company_id: string
          created_at: string
          current_amount: number
          id: string
          notes: string | null
          original_amount: number
          project_id: string
          release_conditions: string | null
          release_percentage: number | null
          retention_type: string
          scheduled_release_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_release_date?: string | null
          company_id: string
          created_at?: string
          current_amount: number
          id?: string
          notes?: string | null
          original_amount: number
          project_id: string
          release_conditions?: string | null
          release_percentage?: number | null
          retention_type: string
          scheduled_release_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_release_date?: string | null
          company_id?: string
          created_at?: string
          current_amount?: number
          id?: string
          notes?: string | null
          original_amount?: number
          project_id?: string
          release_conditions?: string | null
          release_percentage?: number | null
          retention_type?: string
          scheduled_release_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      retention_tracking: {
        Row: {
          amount_pending: number
          amount_released: number | null
          client_name: string
          company_id: string
          contract_amount: number
          created_at: string
          id: string
          notes: string | null
          project_id: string | null
          release_date: string | null
          retention_amount: number
          retention_percentage: number
          status: string
          updated_at: string
        }
        Insert: {
          amount_pending: number
          amount_released?: number | null
          client_name: string
          company_id: string
          contract_amount: number
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          release_date?: string | null
          retention_amount: number
          retention_percentage?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount_pending?: number
          amount_released?: number | null
          client_name?: string
          company_id?: string
          contract_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          release_date?: string | null
          retention_amount?: number
          retention_percentage?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_metrics: {
        Row: {
          arr: number | null
          average_ltv: number | null
          average_ltv_new: number | null
          cac: number | null
          calculated_at: string | null
          churned_customers: number | null
          churned_mrr: number | null
          contraction_mrr: number | null
          customer_churn_rate: number | null
          customer_growth_rate: number | null
          expansion_mrr: number | null
          id: string
          ltv_cac_ratio: number | null
          mrr: number | null
          mrr_growth_rate: number | null
          net_new_mrr: number | null
          new_customers: number | null
          new_mrr: number | null
          payback_period_months: number | null
          period_date: string
          period_type: string
          resurrected_customers: number | null
          revenue_churn_rate: number | null
          total_customers: number | null
        }
        Insert: {
          arr?: number | null
          average_ltv?: number | null
          average_ltv_new?: number | null
          cac?: number | null
          calculated_at?: string | null
          churned_customers?: number | null
          churned_mrr?: number | null
          contraction_mrr?: number | null
          customer_churn_rate?: number | null
          customer_growth_rate?: number | null
          expansion_mrr?: number | null
          id?: string
          ltv_cac_ratio?: number | null
          mrr?: number | null
          mrr_growth_rate?: number | null
          net_new_mrr?: number | null
          new_customers?: number | null
          new_mrr?: number | null
          payback_period_months?: number | null
          period_date: string
          period_type: string
          resurrected_customers?: number | null
          revenue_churn_rate?: number | null
          total_customers?: number | null
        }
        Update: {
          arr?: number | null
          average_ltv?: number | null
          average_ltv_new?: number | null
          cac?: number | null
          calculated_at?: string | null
          churned_customers?: number | null
          churned_mrr?: number | null
          contraction_mrr?: number | null
          customer_churn_rate?: number | null
          customer_growth_rate?: number | null
          expansion_mrr?: number | null
          id?: string
          ltv_cac_ratio?: number | null
          mrr?: number | null
          mrr_growth_rate?: number | null
          net_new_mrr?: number | null
          new_customers?: number | null
          new_mrr?: number | null
          payback_period_months?: number | null
          period_date?: string
          period_type?: string
          resurrected_customers?: number | null
          revenue_churn_rate?: number | null
          total_customers?: number | null
        }
        Relationships: []
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
      risk_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          id: string
          message: string
          project_id: string | null
          resolved_at: string | null
          risk_prediction_id: string | null
          severity: string
          status: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          project_id?: string | null
          resolved_at?: string | null
          risk_prediction_id?: string | null
          severity: string
          status?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          project_id?: string | null
          resolved_at?: string | null
          risk_prediction_id?: string | null
          severity?: string
          status?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "risk_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_risk_prediction_id_fkey"
            columns: ["risk_prediction_id"]
            isOneToOne: false
            referencedRelation: "risk_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_factors: {
        Row: {
          created_at: string | null
          description: string | null
          factor_name: string
          factor_type: string
          id: string
          impact_score: number
          is_mitigated: boolean | null
          likelihood: number
          mitigation_strategy: string | null
          risk_prediction_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          factor_name: string
          factor_type: string
          id?: string
          impact_score: number
          is_mitigated?: boolean | null
          likelihood: number
          mitigation_strategy?: string | null
          risk_prediction_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          factor_name?: string
          factor_type?: string
          id?: string
          impact_score?: number
          is_mitigated?: boolean | null
          likelihood?: number
          mitigation_strategy?: string | null
          risk_prediction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_factors_risk_prediction_id_fkey"
            columns: ["risk_prediction_id"]
            isOneToOne: false
            referencedRelation: "risk_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_history: {
        Row: {
          actual_cost_overrun: number | null
          actual_delay_days: number | null
          actual_risk_score: number | null
          created_at: string | null
          id: string
          predicted_cost_overrun: number | null
          predicted_delay_days: number | null
          predicted_risk_score: number | null
          prediction_accuracy: number | null
          prediction_date: string
          project_id: string | null
          tenant_id: string
        }
        Insert: {
          actual_cost_overrun?: number | null
          actual_delay_days?: number | null
          actual_risk_score?: number | null
          created_at?: string | null
          id?: string
          predicted_cost_overrun?: number | null
          predicted_delay_days?: number | null
          predicted_risk_score?: number | null
          prediction_accuracy?: number | null
          prediction_date: string
          project_id?: string | null
          tenant_id: string
        }
        Update: {
          actual_cost_overrun?: number | null
          actual_delay_days?: number | null
          actual_risk_score?: number | null
          created_at?: string | null
          id?: string
          predicted_cost_overrun?: number | null
          predicted_delay_days?: number | null
          predicted_risk_score?: number | null
          prediction_accuracy?: number | null
          prediction_date?: string
          project_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "risk_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_predictions: {
        Row: {
          budget_risk_score: number | null
          confidence_score: number | null
          created_at: string | null
          delay_risk_score: number | null
          id: string
          model_version: string | null
          overall_risk_score: number
          predicted_completion_date: string | null
          predicted_cost_overrun: number | null
          predicted_delay_days: number | null
          prediction_date: string | null
          project_id: string | null
          quality_risk_score: number | null
          risk_level: string
          safety_risk_score: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          budget_risk_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          delay_risk_score?: number | null
          id?: string
          model_version?: string | null
          overall_risk_score: number
          predicted_completion_date?: string | null
          predicted_cost_overrun?: number | null
          predicted_delay_days?: number | null
          prediction_date?: string | null
          project_id?: string | null
          quality_risk_score?: number | null
          risk_level: string
          safety_risk_score?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          budget_risk_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          delay_risk_score?: number | null
          id?: string
          model_version?: string | null
          overall_risk_score?: number
          predicted_completion_date?: string | null
          predicted_cost_overrun?: number | null
          predicted_delay_days?: number | null
          prediction_date?: string | null
          project_id?: string | null
          quality_risk_score?: number | null
          risk_level?: string
          safety_risk_score?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "risk_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_predictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_recommendations: {
        Row: {
          created_at: string | null
          description: string
          expected_cost_savings: number | null
          expected_time_savings: number | null
          id: string
          implemented_at: string | null
          priority: string
          recommendation_type: string
          risk_prediction_id: string
          status: string | null
          success_probability: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          expected_cost_savings?: number | null
          expected_time_savings?: number | null
          id?: string
          implemented_at?: string | null
          priority: string
          recommendation_type: string
          risk_prediction_id: string
          status?: string | null
          success_probability?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          expected_cost_savings?: number | null
          expected_time_savings?: number | null
          id?: string
          implemented_at?: string | null
          priority?: string
          recommendation_type?: string
          risk_prediction_id?: string
          status?: string | null
          success_probability?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_recommendations_risk_prediction_id_fkey"
            columns: ["risk_prediction_id"]
            isOneToOne: false
            referencedRelation: "risk_predictions"
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
      safety_inspections: {
        Row: {
          checklist_items: Json
          created_at: string | null
          failed_items: number | null
          followup_date: string | null
          hazards_identified: number | null
          id: string
          inspection_date: string
          inspection_type: string
          inspector_id: string
          inspector_name: string | null
          notes: string | null
          overall_score: number | null
          pass_fail_status: string | null
          passed_items: number | null
          photo_urls: string[] | null
          project_id: string
          requires_followup: boolean | null
          tenant_id: string
          total_items: number | null
          violations_found: number | null
        }
        Insert: {
          checklist_items: Json
          created_at?: string | null
          failed_items?: number | null
          followup_date?: string | null
          hazards_identified?: number | null
          id?: string
          inspection_date: string
          inspection_type: string
          inspector_id: string
          inspector_name?: string | null
          notes?: string | null
          overall_score?: number | null
          pass_fail_status?: string | null
          passed_items?: number | null
          photo_urls?: string[] | null
          project_id: string
          requires_followup?: boolean | null
          tenant_id: string
          total_items?: number | null
          violations_found?: number | null
        }
        Update: {
          checklist_items?: Json
          created_at?: string | null
          failed_items?: number | null
          followup_date?: string | null
          hazards_identified?: number | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_id?: string
          inspector_name?: string | null
          notes?: string | null
          overall_score?: number | null
          pass_fail_status?: string | null
          passed_items?: number | null
          photo_urls?: string[] | null
          project_id?: string
          requires_followup?: boolean | null
          tenant_id?: string
          total_items?: number | null
          violations_found?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_training: {
        Row: {
          certificate_url: string | null
          certification_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          instructor_name: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          status: string | null
          tenant_id: string
          training_date: string
          training_name: string
          training_provider: string | null
          training_type: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          certification_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          instructor_name?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          status?: string | null
          tenant_id: string
          training_date: string
          training_name: string
          training_provider?: string | null
          training_type: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          certification_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          instructor_name?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          status?: string | null
          tenant_id?: string
          training_date?: string
          training_name?: string
          training_provider?: string | null
          training_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_training_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_training_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_violations: {
        Row: {
          corrected_date: string | null
          corrective_action_required: string | null
          corrective_action_taken: string | null
          created_at: string | null
          description: string
          id: string
          inspection_id: string | null
          osha_standard: string | null
          project_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
          tenant_id: string
          violation_date: string
          violation_type: string
        }
        Insert: {
          corrected_date?: string | null
          corrective_action_required?: string | null
          corrective_action_taken?: string | null
          created_at?: string | null
          description: string
          id?: string
          inspection_id?: string | null
          osha_standard?: string | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          tenant_id: string
          violation_date: string
          violation_type: string
        }
        Update: {
          corrected_date?: string | null
          corrective_action_required?: string | null
          corrective_action_taken?: string | null
          created_at?: string | null
          description?: string
          id?: string
          inspection_id?: string | null
          osha_standard?: string | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          tenant_id?: string
          violation_date?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_violations_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "safety_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_violations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_violations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_violations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_violations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_contact_requests: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          company_name: string
          contacted_at: string | null
          created_at: string | null
          email: string
          estimated_budget: string | null
          first_name: string
          id: string
          inquiry_type: string | null
          last_name: string
          lead_id: string | null
          message: string
          notes: string | null
          phone: string | null
          status: string | null
          timeline: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          company_name: string
          contacted_at?: string | null
          created_at?: string | null
          email: string
          estimated_budget?: string | null
          first_name: string
          id?: string
          inquiry_type?: string | null
          last_name: string
          lead_id?: string | null
          message: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          company_name?: string
          contacted_at?: string | null
          created_at?: string | null
          email?: string
          estimated_budget?: string | null
          first_name?: string
          id?: string
          inquiry_type?: string | null
          last_name?: string
          lead_id?: string | null
          message?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_contact_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      sandbox_requests: {
        Row: {
          created_at: string | null
          documentation_id: string | null
          endpoint_path: string
          error_message: string | null
          http_method: string
          id: string
          ip_address: string | null
          is_sandbox: boolean | null
          query_params: Json | null
          request_body: Json | null
          request_headers: Json | null
          response_body: Json | null
          response_headers: Json | null
          response_status_code: number | null
          response_time_ms: number | null
          session_id: string | null
          success: boolean | null
          tenant_id: string | null
          used_api_key: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          documentation_id?: string | null
          endpoint_path: string
          error_message?: string | null
          http_method: string
          id?: string
          ip_address?: string | null
          is_sandbox?: boolean | null
          query_params?: Json | null
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          response_headers?: Json | null
          response_status_code?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
          tenant_id?: string | null
          used_api_key?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          documentation_id?: string | null
          endpoint_path?: string
          error_message?: string | null
          http_method?: string
          id?: string
          ip_address?: string | null
          is_sandbox?: boolean | null
          query_params?: Json | null
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          response_headers?: Json | null
          response_status_code?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
          tenant_id?: string | null
          used_api_key?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sandbox_requests_documentation_id_fkey"
            columns: ["documentation_id"]
            isOneToOne: false
            referencedRelation: "api_documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sandbox_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      schedule_conflicts: {
        Row: {
          affected_tasks: Json | null
          company_id: string
          conflict_type: string
          created_at: string
          description: string
          id: string
          project_id: string
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          suggested_resolution: string | null
          updated_at: string
        }
        Insert: {
          affected_tasks?: Json | null
          company_id: string
          conflict_type: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          suggested_resolution?: string | null
          updated_at?: string
        }
        Update: {
          affected_tasks?: Json | null
          company_id?: string
          conflict_type?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          suggested_resolution?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule_constraints: {
        Row: {
          category: string
          constraint_rule: Json
          constraint_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          project_id: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          category: string
          constraint_rule: Json
          constraint_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          project_id?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          category?: string
          constraint_rule?: Json
          constraint_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          project_id?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_constraints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_constraints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
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
      sso_connections: {
        Row: {
          allowed_domains: string[] | null
          config: Json
          created_at: string | null
          created_by: string | null
          default_role: string | null
          display_name: string
          id: string
          is_default: boolean | null
          is_enabled: boolean | null
          last_used_at: string | null
          provider: string
          tenant_id: string | null
          total_logins: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_domains?: string[] | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          default_role?: string | null
          display_name: string
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          last_used_at?: string | null
          provider: string
          tenant_id?: string | null
          total_logins?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_domains?: string[] | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          default_role?: string | null
          display_name?: string
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          last_used_at?: string | null
          provider?: string
          tenant_id?: string | null
          total_logins?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      subcontractor_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          net_amount: number
          paid_date: string | null
          payment_method: string | null
          project_id: string | null
          retention_amount: number | null
          status: string
          subcontractor_name: string
          trade: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          net_amount: number
          paid_date?: string | null
          payment_method?: string | null
          project_id?: string | null
          retention_amount?: number | null
          status?: string
          subcontractor_name: string
          trade: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          net_amount?: number
          paid_date?: string | null
          payment_method?: string | null
          project_id?: string | null
          retention_amount?: number | null
          status?: string
          subcontractor_name?: string
          trade?: string
          updated_at?: string
        }
        Relationships: []
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
      supplier_catalog: {
        Row: {
          bulk_discount_percentage: number | null
          bulk_discount_threshold: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_order_date: string | null
          lead_time_days: number | null
          material_name: string
          material_sku: string | null
          minimum_order_quantity: number | null
          supplier_contact: string | null
          supplier_name: string
          supplier_rating: number | null
          tenant_id: string | null
          unit: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          bulk_discount_percentage?: number | null
          bulk_discount_threshold?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_order_date?: string | null
          lead_time_days?: number | null
          material_name: string
          material_sku?: string | null
          minimum_order_quantity?: number | null
          supplier_contact?: string | null
          supplier_name: string
          supplier_rating?: number | null
          tenant_id?: string | null
          unit: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          bulk_discount_percentage?: number | null
          bulk_discount_threshold?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_order_date?: string | null
          lead_time_days?: number | null
          material_name?: string
          material_sku?: string | null
          minimum_order_quantity?: number | null
          supplier_contact?: string | null
          supplier_name?: string
          supplier_rating?: number | null
          tenant_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_preferred: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_preferred?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_preferred?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          weather_constraints: Json | null
          weather_last_check: string | null
          weather_sensitive: boolean | null
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
          weather_constraints?: Json | null
          weather_last_check?: string | null
          weather_sensitive?: boolean | null
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
          weather_constraints?: Json | null
          weather_last_check?: string | null
          weather_sensitive?: boolean | null
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
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: string | null
          status: string | null
          tenant_id: string
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: string | null
          status?: string | null
          tenant_id: string
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: string | null
          status?: string | null
          tenant_id?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_type: string | null
          setting_value: Json
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_type?: string | null
          setting_value: Json
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_type?: string | null
          setting_value?: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage_metrics: {
        Row: {
          active_projects: number | null
          active_users: number | null
          api_requests: number | null
          created_at: string | null
          id: string
          mrr: number | null
          period_end: string
          period_start: string
          storage_used_bytes: number | null
          tenant_id: string
          total_projects: number | null
          total_users: number | null
          updated_at: string | null
          webhook_deliveries: number | null
        }
        Insert: {
          active_projects?: number | null
          active_users?: number | null
          api_requests?: number | null
          created_at?: string | null
          id?: string
          mrr?: number | null
          period_end: string
          period_start: string
          storage_used_bytes?: number | null
          tenant_id: string
          total_projects?: number | null
          total_users?: number | null
          updated_at?: string | null
          webhook_deliveries?: number | null
        }
        Update: {
          active_projects?: number | null
          active_users?: number | null
          api_requests?: number | null
          created_at?: string | null
          id?: string
          mrr?: number | null
          period_end?: string
          period_start?: string
          storage_used_bytes?: number | null
          tenant_id?: string
          total_projects?: number | null
          total_users?: number | null
          updated_at?: string | null
          webhook_deliveries?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          last_seen_at: string | null
          permissions: Json | null
          role: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          permissions?: Json | null
          role?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          permissions?: Json | null
          role?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          branding: Json | null
          city: string | null
          country: string | null
          created_at: string | null
          custom_domain: string | null
          deleted_at: string | null
          display_name: string | null
          domain: string | null
          domain_verified: boolean | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_suspended: boolean | null
          logo_url: string | null
          max_projects: number | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          owner_email: string | null
          phone: string | null
          plan_tier: string | null
          postal_code: string | null
          settings: Json | null
          slug: string
          state: string | null
          subscription_status: string | null
          support_email: string | null
          suspended_at: string | null
          suspended_reason: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string | null
          branding?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_domain?: string | null
          deleted_at?: string | null
          display_name?: string | null
          domain?: string | null
          domain_verified?: boolean | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_suspended?: boolean | null
          logo_url?: string | null
          max_projects?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          owner_email?: string | null
          phone?: string | null
          plan_tier?: string | null
          postal_code?: string | null
          settings?: Json | null
          slug: string
          state?: string | null
          subscription_status?: string | null
          support_email?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string | null
          branding?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_domain?: string | null
          deleted_at?: string | null
          display_name?: string | null
          domain?: string | null
          domain_verified?: boolean | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_suspended?: boolean | null
          logo_url?: string | null
          max_projects?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          owner_email?: string | null
          phone?: string | null
          plan_tier?: string | null
          postal_code?: string | null
          settings?: Json | null
          slug?: string
          state?: string | null
          subscription_status?: string | null
          support_email?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
      timeline_optimizations: {
        Row: {
          applied_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          estimated_time_saved: number | null
          id: string
          optimization_type: string
          optimizations_applied: Json | null
          project_id: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          estimated_time_saved?: number | null
          id?: string
          optimization_type: string
          optimizations_applied?: Json | null
          project_id: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          estimated_time_saved?: number | null
          id?: string
          optimization_type?: string
          optimizations_applied?: Json | null
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      toolbox_talks: {
        Row: {
          attendee_count: number | null
          attendees: Json | null
          conducted_by: string | null
          created_at: string | null
          description: string | null
          id: string
          photo_urls: string[] | null
          project_id: string | null
          signature_urls: string[] | null
          talk_date: string
          tenant_id: string
          topic: string
          topics_covered: string[] | null
        }
        Insert: {
          attendee_count?: number | null
          attendees?: Json | null
          conducted_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          photo_urls?: string[] | null
          project_id?: string | null
          signature_urls?: string[] | null
          talk_date: string
          tenant_id: string
          topic: string
          topics_covered?: string[] | null
        }
        Update: {
          attendee_count?: number | null
          attendees?: Json | null
          conducted_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          photo_urls?: string[] | null
          project_id?: string | null
          signature_urls?: string[] | null
          talk_date?: string
          tenant_id?: string
          topic?: string
          topics_covered?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talks_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_conflicts: {
        Row: {
          affected_trades: Json | null
          company_id: string
          conflict_type: string
          created_at: string
          description: string
          handoff_id: string | null
          id: string
          project_id: string
          resolution_plan: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          affected_trades?: Json | null
          company_id: string
          conflict_type: string
          created_at?: string
          description: string
          handoff_id?: string | null
          id?: string
          project_id: string
          resolution_plan?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          affected_trades?: Json | null
          company_id?: string
          conflict_type?: string
          created_at?: string
          description?: string
          handoff_id?: string | null
          id?: string
          project_id?: string
          resolution_plan?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trade_handoffs: {
        Row: {
          company_id: string
          completion_percentage: number | null
          created_at: string
          from_trade: string
          handoff_date: string
          id: string
          notes: string | null
          project_id: string
          quality_checklist: Json | null
          quality_score: number | null
          sign_off_from_trade: string | null
          sign_off_to_trade: string | null
          signed_off_at: string | null
          status: string | null
          to_trade: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completion_percentage?: number | null
          created_at?: string
          from_trade: string
          handoff_date: string
          id?: string
          notes?: string | null
          project_id: string
          quality_checklist?: Json | null
          quality_score?: number | null
          sign_off_from_trade?: string | null
          sign_off_to_trade?: string | null
          signed_off_at?: string | null
          status?: string | null
          to_trade: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completion_percentage?: number | null
          created_at?: string
          from_trade?: string
          handoff_date?: string
          id?: string
          notes?: string | null
          project_id?: string
          quality_checklist?: Json | null
          quality_score?: number | null
          sign_off_from_trade?: string | null
          sign_off_to_trade?: string | null
          signed_off_at?: string | null
          status?: string | null
          to_trade?: string
          updated_at?: string
        }
        Relationships: []
      }
      trade_performance_metrics: {
        Row: {
          company_id: string
          created_at: string
          handoff_efficiency_score: number | null
          id: string
          on_time_completion_rate: number | null
          period_end: string
          period_start: string
          project_id: string
          quality_average_score: number | null
          total_handoffs_completed: number | null
          trade_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          handoff_efficiency_score?: number | null
          id?: string
          on_time_completion_rate?: number | null
          period_end: string
          period_start: string
          project_id: string
          quality_average_score?: number | null
          total_handoffs_completed?: number | null
          trade_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          handoff_efficiency_score?: number | null
          id?: string
          on_time_completion_rate?: number | null
          period_end?: string
          period_start?: string
          project_id?: string
          quality_average_score?: number | null
          total_handoffs_completed?: number | null
          trade_name?: string
          updated_at?: string
        }
        Relationships: []
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
      travel_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          distance_meters: number | null
          duration_minutes: number | null
          end_address: string | null
          end_lat: number | null
          end_lng: number | null
          end_timestamp: string | null
          from_project_id: string | null
          id: string
          is_approved: boolean | null
          is_billable: boolean | null
          metadata: Json | null
          mileage_rate_per_km: number | null
          notes: string | null
          purpose: string | null
          route_polyline: string | null
          start_address: string | null
          start_lat: number
          start_lng: number
          start_timestamp: string
          status: string | null
          to_project_id: string | null
          total_reimbursement: number | null
          travel_method: string | null
          updated_at: string | null
          user_id: string
          waypoints: Json | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          distance_meters?: number | null
          duration_minutes?: number | null
          end_address?: string | null
          end_lat?: number | null
          end_lng?: number | null
          end_timestamp?: string | null
          from_project_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_billable?: boolean | null
          metadata?: Json | null
          mileage_rate_per_km?: number | null
          notes?: string | null
          purpose?: string | null
          route_polyline?: string | null
          start_address?: string | null
          start_lat: number
          start_lng: number
          start_timestamp: string
          status?: string | null
          to_project_id?: string | null
          total_reimbursement?: number | null
          travel_method?: string | null
          updated_at?: string | null
          user_id: string
          waypoints?: Json | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          distance_meters?: number | null
          duration_minutes?: number | null
          end_address?: string | null
          end_lat?: number | null
          end_lng?: number | null
          end_timestamp?: string | null
          from_project_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_billable?: boolean | null
          metadata?: Json | null
          mileage_rate_per_km?: number | null
          notes?: string | null
          purpose?: string | null
          route_polyline?: string | null
          start_address?: string | null
          start_lat?: number
          start_lng?: number
          start_timestamp?: string
          status?: string | null
          to_project_id?: string | null
          total_reimbursement?: number | null
          travel_method?: string | null
          updated_at?: string | null
          user_id?: string
          waypoints?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_logs_from_project_id_fkey"
            columns: ["from_project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "travel_logs_from_project_id_fkey"
            columns: ["from_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_logs_to_project_id_fkey"
            columns: ["to_project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "travel_logs_to_project_id_fkey"
            columns: ["to_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          device_id: string
          device_name: string | null
          device_type: string | null
          id: string
          is_trusted: boolean | null
          last_ip_address: string | null
          last_seen_at: string | null
          trust_expires_at: string | null
          trusted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_id: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          is_trusted?: boolean | null
          last_ip_address?: string | null
          last_seen_at?: string | null
          trust_expires_at?: string | null
          trusted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_id?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          is_trusted?: boolean | null
          last_ip_address?: string | null
          last_seen_at?: string | null
          trust_expires_at?: string | null
          trusted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_attribution: {
        Row: {
          created_at: string | null
          first_touch_at: string | null
          first_touch_landing_page: string | null
          first_touch_referrer: string | null
          first_touch_utm_campaign: string | null
          first_touch_utm_content: string | null
          first_touch_utm_medium: string | null
          first_touch_utm_source: string | null
          first_touch_utm_term: string | null
          last_touch_at: string | null
          last_touch_landing_page: string | null
          last_touch_referrer: string | null
          last_touch_utm_campaign: string | null
          last_touch_utm_content: string | null
          last_touch_utm_medium: string | null
          last_touch_utm_source: string | null
          last_touch_utm_term: string | null
          total_touchpoints: number | null
          touchpoint_history: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          first_touch_at?: string | null
          first_touch_landing_page?: string | null
          first_touch_referrer?: string | null
          first_touch_utm_campaign?: string | null
          first_touch_utm_content?: string | null
          first_touch_utm_medium?: string | null
          first_touch_utm_source?: string | null
          first_touch_utm_term?: string | null
          last_touch_at?: string | null
          last_touch_landing_page?: string | null
          last_touch_referrer?: string | null
          last_touch_utm_campaign?: string | null
          last_touch_utm_content?: string | null
          last_touch_utm_medium?: string | null
          last_touch_utm_source?: string | null
          last_touch_utm_term?: string | null
          total_touchpoints?: number | null
          touchpoint_history?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          first_touch_at?: string | null
          first_touch_landing_page?: string | null
          first_touch_referrer?: string | null
          first_touch_utm_campaign?: string | null
          first_touch_utm_content?: string | null
          first_touch_utm_medium?: string | null
          first_touch_utm_source?: string | null
          first_touch_utm_term?: string | null
          last_touch_at?: string | null
          last_touch_landing_page?: string | null
          last_touch_referrer?: string | null
          last_touch_utm_campaign?: string | null
          last_touch_utm_content?: string | null
          last_touch_utm_medium?: string | null
          last_touch_utm_source?: string | null
          last_touch_utm_term?: string | null
          total_touchpoints?: number | null
          touchpoint_history?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_cohorts: {
        Row: {
          acquisition_channel: string | null
          created_at: string | null
          current_stage: string | null
          first_paid_date: string | null
          initial_mrr: number | null
          initial_plan: string | null
          paid_cohort: string | null
          signup_cohort: string
          signup_date: string
          signup_week: string
          trial_start_cohort: string | null
          trial_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acquisition_channel?: string | null
          created_at?: string | null
          current_stage?: string | null
          first_paid_date?: string | null
          initial_mrr?: number | null
          initial_plan?: string | null
          paid_cohort?: string | null
          signup_cohort: string
          signup_date: string
          signup_week: string
          trial_start_cohort?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acquisition_channel?: string | null
          created_at?: string | null
          current_stage?: string | null
          first_paid_date?: string | null
          initial_mrr?: number | null
          initial_plan?: string | null
          paid_cohort?: string | null
          signup_cohort?: string
          signup_date?: string
          signup_week?: string
          trial_start_cohort?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_engagement_summary: {
        Row: {
          activation_score: number | null
          activity_streak_days: number | null
          aha_moment_reached_at: string | null
          average_session_time_minutes: number | null
          churn_risk_score: number | null
          completed_onboarding: boolean | null
          created_at: string | null
          days_active: number | null
          days_since_signup: number | null
          documents_uploaded: number | null
          engagement_score: number | null
          expansion_potential_score: number | null
          feature_adoption_rate: number | null
          first_session_at: string | null
          first_value_achieved: boolean | null
          health_score: number | null
          integrations_connected: number | null
          invited_team_member: boolean | null
          invoices_sent: number | null
          is_trial: boolean | null
          last_active_at: string | null
          last_calculated_at: string | null
          last_session_at: string | null
          longest_streak_days: number | null
          onboarding_completed_at: string | null
          projects_created: number | null
          reached_aha_moment: boolean | null
          reports_generated: number | null
          tasks_completed: number | null
          team_members_invited: number | null
          time_entries_logged: number | null
          total_session_time_minutes: number | null
          total_sessions: number | null
          trial_days_remaining: number | null
          trial_engagement_level: string | null
          updated_at: string | null
          used_change_orders: boolean | null
          used_daily_reports: boolean | null
          used_document_management: boolean | null
          used_integrations: boolean | null
          used_job_costing: boolean | null
          used_mobile_app: boolean | null
          used_rfis: boolean | null
          used_schedule_management: boolean | null
          used_team_collaboration: boolean | null
          used_time_tracking: boolean | null
          user_id: string
        }
        Insert: {
          activation_score?: number | null
          activity_streak_days?: number | null
          aha_moment_reached_at?: string | null
          average_session_time_minutes?: number | null
          churn_risk_score?: number | null
          completed_onboarding?: boolean | null
          created_at?: string | null
          days_active?: number | null
          days_since_signup?: number | null
          documents_uploaded?: number | null
          engagement_score?: number | null
          expansion_potential_score?: number | null
          feature_adoption_rate?: number | null
          first_session_at?: string | null
          first_value_achieved?: boolean | null
          health_score?: number | null
          integrations_connected?: number | null
          invited_team_member?: boolean | null
          invoices_sent?: number | null
          is_trial?: boolean | null
          last_active_at?: string | null
          last_calculated_at?: string | null
          last_session_at?: string | null
          longest_streak_days?: number | null
          onboarding_completed_at?: string | null
          projects_created?: number | null
          reached_aha_moment?: boolean | null
          reports_generated?: number | null
          tasks_completed?: number | null
          team_members_invited?: number | null
          time_entries_logged?: number | null
          total_session_time_minutes?: number | null
          total_sessions?: number | null
          trial_days_remaining?: number | null
          trial_engagement_level?: string | null
          updated_at?: string | null
          used_change_orders?: boolean | null
          used_daily_reports?: boolean | null
          used_document_management?: boolean | null
          used_integrations?: boolean | null
          used_job_costing?: boolean | null
          used_mobile_app?: boolean | null
          used_rfis?: boolean | null
          used_schedule_management?: boolean | null
          used_team_collaboration?: boolean | null
          used_time_tracking?: boolean | null
          user_id: string
        }
        Update: {
          activation_score?: number | null
          activity_streak_days?: number | null
          aha_moment_reached_at?: string | null
          average_session_time_minutes?: number | null
          churn_risk_score?: number | null
          completed_onboarding?: boolean | null
          created_at?: string | null
          days_active?: number | null
          days_since_signup?: number | null
          documents_uploaded?: number | null
          engagement_score?: number | null
          expansion_potential_score?: number | null
          feature_adoption_rate?: number | null
          first_session_at?: string | null
          first_value_achieved?: boolean | null
          health_score?: number | null
          integrations_connected?: number | null
          invited_team_member?: boolean | null
          invoices_sent?: number | null
          is_trial?: boolean | null
          last_active_at?: string | null
          last_calculated_at?: string | null
          last_session_at?: string | null
          longest_streak_days?: number | null
          onboarding_completed_at?: string | null
          projects_created?: number | null
          reached_aha_moment?: boolean | null
          reports_generated?: number | null
          tasks_completed?: number | null
          team_members_invited?: number | null
          time_entries_logged?: number | null
          total_session_time_minutes?: number | null
          total_sessions?: number | null
          trial_days_remaining?: number | null
          trial_engagement_level?: string | null
          updated_at?: string | null
          used_change_orders?: boolean | null
          used_daily_reports?: boolean | null
          used_document_management?: boolean | null
          used_integrations?: boolean | null
          used_job_costing?: boolean | null
          used_mobile_app?: boolean | null
          used_rfis?: boolean | null
          used_schedule_management?: boolean | null
          used_team_collaboration?: boolean | null
          used_time_tracking?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          anonymous_id: string | null
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          event_category: string | null
          event_name: string
          event_properties: Json | null
          id: string
          ip_address: unknown
          os: string | null
          page_title: string | null
          page_url: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          anonymous_id?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_category?: string | null
          event_name: string
          event_properties?: Json | null
          id?: string
          ip_address?: unknown
          os?: string | null
          page_title?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          anonymous_id?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_category?: string | null
          event_name?: string
          event_properties?: Json | null
          id?: string
          ip_address?: unknown
          os?: string | null
          page_title?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      user_health_scores: {
        Row: {
          active_projects: number | null
          avg_support_response_time: number | null
          churn_risk_level: string | null
          churn_risk_score: number | null
          created_at: string | null
          days_since_activity: number | null
          days_since_login: number | null
          days_until_renewal: number | null
          engagement_score: number | null
          feature_adoption_rate: number | null
          health_score: number
          health_trend: string | null
          last_calculated_at: string | null
          lifetime_value: number | null
          login_frequency: number | null
          months_as_customer: number | null
          open_support_tickets: number | null
          payment_failures: number | null
          payment_score: number | null
          product_adoption_score: number | null
          support_satisfaction_score: number | null
          support_score: number | null
          team_size: number | null
          updated_at: string | null
          user_id: string
          weekly_time_entries: number | null
        }
        Insert: {
          active_projects?: number | null
          avg_support_response_time?: number | null
          churn_risk_level?: string | null
          churn_risk_score?: number | null
          created_at?: string | null
          days_since_activity?: number | null
          days_since_login?: number | null
          days_until_renewal?: number | null
          engagement_score?: number | null
          feature_adoption_rate?: number | null
          health_score?: number
          health_trend?: string | null
          last_calculated_at?: string | null
          lifetime_value?: number | null
          login_frequency?: number | null
          months_as_customer?: number | null
          open_support_tickets?: number | null
          payment_failures?: number | null
          payment_score?: number | null
          product_adoption_score?: number | null
          support_satisfaction_score?: number | null
          support_score?: number | null
          team_size?: number | null
          updated_at?: string | null
          user_id: string
          weekly_time_entries?: number | null
        }
        Update: {
          active_projects?: number | null
          avg_support_response_time?: number | null
          churn_risk_level?: string | null
          churn_risk_score?: number | null
          created_at?: string | null
          days_since_activity?: number | null
          days_since_login?: number | null
          days_until_renewal?: number | null
          engagement_score?: number | null
          feature_adoption_rate?: number | null
          health_score?: number
          health_trend?: string | null
          last_calculated_at?: string | null
          lifetime_value?: number | null
          login_frequency?: number | null
          months_as_customer?: number | null
          open_support_tickets?: number | null
          payment_failures?: number | null
          payment_score?: number | null
          product_adoption_score?: number | null
          support_satisfaction_score?: number | null
          support_score?: number | null
          team_size?: number | null
          updated_at?: string | null
          user_id?: string
          weekly_time_entries?: number | null
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          app_id: string
          config: Json | null
          connected_at: string | null
          created_at: string | null
          disconnected_at: string | null
          error_count: number | null
          error_message: string | null
          id: string
          installed_at: string | null
          is_active: boolean | null
          last_error_at: string | null
          last_sync_at: string | null
          next_sync_at: string | null
          refresh_token: string | null
          scopes: string[] | null
          status: string | null
          sync_enabled: boolean | null
          sync_frequency: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          app_id: string
          config?: Json | null
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          last_error_at?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string | null
          sync_enabled?: boolean | null
          sync_frequency?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          app_id?: string
          config?: Json | null
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          last_error_at?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string | null
          sync_enabled?: boolean | null
          sync_frequency?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_integrations_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "integration_apps"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security: {
        Row: {
          account_locked_until: string | null
          backup_codes: string[] | null
          created_at: string
          failed_login_attempts: number | null
          id: string
          last_failed_attempt: string | null
          last_login_ip: unknown
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
          last_login_ip?: unknown
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
          last_login_ip?: unknown
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
          auth_method: string | null
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_id: string | null
          device_name: string | null
          device_type: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          is_trusted_device: boolean | null
          last_activity_at: string | null
          mfa_verified: boolean | null
          os: string | null
          refresh_token: string | null
          requires_mfa: boolean | null
          session_token: string
          sso_connection_id: string | null
          tenant_id: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_method?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_trusted_device?: boolean | null
          last_activity_at?: string | null
          mfa_verified?: boolean | null
          os?: string | null
          refresh_token?: string | null
          requires_mfa?: boolean | null
          session_token: string
          sso_connection_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_method?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_trusted_device?: boolean | null
          last_activity_at?: string | null
          mfa_verified?: boolean | null
          os?: string | null
          refresh_token?: string | null
          requires_mfa?: boolean | null
          session_token?: string
          sso_connection_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_sso_connection_id_fkey"
            columns: ["sso_connection_id"]
            isOneToOne: false
            referencedRelation: "sso_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trigger_history: {
        Row: {
          action_taken: boolean | null
          action_taken_at: string | null
          execution_id: string | null
          id: string
          rule_id: string
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          action_taken?: boolean | null
          action_taken_at?: string | null
          execution_id?: string | null
          id?: string
          rule_id: string
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          action_taken?: boolean | null
          action_taken_at?: string | null
          execution_id?: string | null
          id?: string
          rule_id?: string
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trigger_history_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "behavioral_trigger_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trigger_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "behavioral_trigger_rules"
            referencedColumns: ["id"]
          },
        ]
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
      weather_forecasts: {
        Row: {
          conditions: string | null
          description: string | null
          expires_at: string
          fetched_at: string
          forecast_data: Json | null
          forecast_date: string
          humidity: number | null
          id: string
          latitude: number | null
          longitude: number | null
          precipitation: number | null
          project_id: string | null
          temperature_max: number | null
          temperature_min: number | null
          wind_speed: number | null
        }
        Insert: {
          conditions?: string | null
          description?: string | null
          expires_at?: string
          fetched_at?: string
          forecast_data?: Json | null
          forecast_date: string
          humidity?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          precipitation?: number | null
          project_id?: string | null
          temperature_max?: number | null
          temperature_min?: number | null
          wind_speed?: number | null
        }
        Update: {
          conditions?: string | null
          description?: string | null
          expires_at?: string
          fetched_at?: string
          forecast_data?: Json | null
          forecast_date?: string
          humidity?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          precipitation?: number | null
          project_id?: string | null
          temperature_max?: number | null
          temperature_min?: number | null
          wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_schedule_adjustments: {
        Row: {
          adjusted_date: string
          adjustment_impact_score: number | null
          auto_adjusted: boolean | null
          created_at: string
          created_by: string | null
          id: string
          original_date: string
          project_id: string
          task_id: string | null
          weather_data: Json | null
          weather_reason: string
        }
        Insert: {
          adjusted_date: string
          adjustment_impact_score?: number | null
          auto_adjusted?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          original_date: string
          project_id: string
          task_id?: string | null
          weather_data?: Json | null
          weather_reason: string
        }
        Update: {
          adjusted_date?: string
          adjustment_impact_score?: number | null
          auto_adjusted?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          original_date?: string
          project_id?: string
          task_id?: string | null
          weather_data?: Json | null
          weather_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_schedule_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_schedule_adjustments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_pl_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_schedule_adjustments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_schedule_adjustments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_sensitive_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          humidity_threshold: number | null
          id: string
          is_active: boolean | null
          max_temperature: number | null
          max_wind_speed: number | null
          min_temperature: number | null
          precipitation_threshold: number | null
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          humidity_threshold?: number | null
          id?: string
          is_active?: boolean | null
          max_temperature?: number | null
          max_wind_speed?: number | null
          min_temperature?: number | null
          precipitation_threshold?: number | null
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          humidity_threshold?: number | null
          id?: string
          is_active?: boolean | null
          max_temperature?: number | null
          max_wind_speed?: number | null
          min_temperature?: number | null
          precipitation_threshold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          next_retry_at: string | null
          request_body: Json
          request_headers: Json | null
          request_method: string | null
          response_body: string | null
          response_headers: Json | null
          response_status_code: number | null
          response_time_ms: number | null
          signature: string | null
          status: string | null
          success: boolean | null
          updated_at: string | null
          url: string
          webhook_endpoint_id: string
          webhook_event_id: string
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          request_body: Json
          request_headers?: Json | null
          request_method?: string | null
          response_body?: string | null
          response_headers?: Json | null
          response_status_code?: number | null
          response_time_ms?: number | null
          signature?: string | null
          status?: string | null
          success?: boolean | null
          updated_at?: string | null
          url: string
          webhook_endpoint_id: string
          webhook_event_id: string
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          request_body?: Json
          request_headers?: Json | null
          request_method?: string | null
          response_body?: string | null
          response_headers?: Json | null
          response_status_code?: number | null
          response_time_ms?: number | null
          signature?: string | null
          status?: string | null
          success?: boolean | null
          updated_at?: string | null
          url?: string
          webhook_endpoint_id?: string
          webhook_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_endpoint_id_fkey"
            columns: ["webhook_endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_delivery_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string | null
          error_message: string | null
          error_type: string | null
          id: string
          request_body: Json | null
          request_headers: Json | null
          response_body: string | null
          response_headers: Json | null
          response_status_code: number | null
          response_time_ms: number | null
          success: boolean | null
          url: string
          webhook_delivery_id: string
        }
        Insert: {
          attempt_number: number
          attempted_at?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: string | null
          response_headers?: Json | null
          response_status_code?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          url: string
          webhook_delivery_id: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: string | null
          response_headers?: Json | null
          response_status_code?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          url?: string
          webhook_delivery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_attempts_webhook_delivery_id_fkey"
            columns: ["webhook_delivery_id"]
            isOneToOne: false
            referencedRelation: "webhook_deliveries"
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
          api_key_id: string | null
          auto_disable_after_failures: number | null
          consecutive_failures: number | null
          created_at: string | null
          custom_headers: Json | null
          description: string | null
          endpoint_name: string | null
          events: string[] | null
          failed_deliveries: number | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_delivery_at: string | null
          last_failure_at: string | null
          last_success_at: string | null
          max_retries: number | null
          metadata: Json | null
          rate_limit_per_minute: number | null
          retry_attempts: number | null
          retry_delay_seconds: number | null
          secret: string
          subscribed_events: string[]
          successful_deliveries: number | null
          tenant_id: string | null
          timeout_seconds: number | null
          total_deliveries: number | null
          updated_at: string | null
          url: string
          user_id: string
          verification_token: string | null
          verified_at: string | null
          verify_ssl: boolean | null
        }
        Insert: {
          api_key_id?: string | null
          auto_disable_after_failures?: number | null
          consecutive_failures?: number | null
          created_at?: string | null
          custom_headers?: Json | null
          description?: string | null
          endpoint_name?: string | null
          events?: string[] | null
          failed_deliveries?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_delivery_at?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          max_retries?: number | null
          metadata?: Json | null
          rate_limit_per_minute?: number | null
          retry_attempts?: number | null
          retry_delay_seconds?: number | null
          secret: string
          subscribed_events?: string[]
          successful_deliveries?: number | null
          tenant_id?: string | null
          timeout_seconds?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          url: string
          user_id: string
          verification_token?: string | null
          verified_at?: string | null
          verify_ssl?: boolean | null
        }
        Update: {
          api_key_id?: string | null
          auto_disable_after_failures?: number | null
          consecutive_failures?: number | null
          created_at?: string | null
          custom_headers?: Json | null
          description?: string | null
          endpoint_name?: string | null
          events?: string[] | null
          failed_deliveries?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_delivery_at?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          max_retries?: number | null
          metadata?: Json | null
          rate_limit_per_minute?: number | null
          retry_attempts?: number | null
          retry_delay_seconds?: number | null
          secret?: string
          subscribed_events?: string[]
          successful_deliveries?: number | null
          tenant_id?: string | null
          timeout_seconds?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          url?: string
          user_id?: string
          verification_token?: string | null
          verified_at?: string | null
          verify_ssl?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          action: string
          completed_deliveries: number | null
          created_at: string | null
          event_type: string
          failed_deliveries: number | null
          id: string
          metadata: Json | null
          payload: Json
          pending_deliveries: number | null
          resource_id: string
          resource_type: string
          tenant_id: string | null
          triggered_by: string | null
        }
        Insert: {
          action: string
          completed_deliveries?: number | null
          created_at?: string | null
          event_type: string
          failed_deliveries?: number | null
          id?: string
          metadata?: Json | null
          payload: Json
          pending_deliveries?: number | null
          resource_id: string
          resource_type: string
          tenant_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          action?: string
          completed_deliveries?: number | null
          created_at?: string | null
          event_type?: string
          failed_deliveries?: number | null
          id?: string
          metadata?: Json | null
          payload?: Json
          pending_deliveries?: number | null
          resource_id?: string
          resource_type?: string
          tenant_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_actions: {
        Row: {
          action_config: Json
          action_order: number
          action_type: string
          created_at: string | null
          delay_seconds: number | null
          execute_if_previous_failure: boolean | null
          execute_if_previous_success: boolean | null
          id: string
          workflow_id: string
        }
        Insert: {
          action_config: Json
          action_order?: number
          action_type: string
          created_at?: string | null
          delay_seconds?: number | null
          execute_if_previous_failure?: boolean | null
          execute_if_previous_success?: boolean | null
          id?: string
          workflow_id: string
        }
        Update: {
          action_config?: Json
          action_order?: number
          action_type?: string
          created_at?: string | null
          delay_seconds?: number | null
          execute_if_previous_failure?: boolean | null
          execute_if_previous_success?: boolean | null
          id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_conditions: {
        Row: {
          condition_order: number
          created_at: string | null
          field_name: string
          field_value: Json
          id: string
          logical_operator: string | null
          operator: string
          workflow_id: string
        }
        Insert: {
          condition_order?: number
          created_at?: string | null
          field_name: string
          field_value: Json
          id?: string
          logical_operator?: string | null
          operator: string
          workflow_id: string
        }
        Update: {
          condition_order?: number
          created_at?: string | null
          field_name?: string
          field_value?: Json
          id?: string
          logical_operator?: string | null
          operator?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_conditions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
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
      workflow_execution_logs: {
        Row: {
          actions_executed: number | null
          actions_failed: number | null
          actions_succeeded: number | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          execution_context: Json | null
          id: string
          started_at: string | null
          status: string
          trigger_event: string
          trigger_type: string
          triggered_by_user_id: string | null
          workflow_id: string
        }
        Insert: {
          actions_executed?: number | null
          actions_failed?: number | null
          actions_succeeded?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          execution_context?: Json | null
          id?: string
          started_at?: string | null
          status: string
          trigger_event: string
          trigger_type: string
          triggered_by_user_id?: string | null
          workflow_id: string
        }
        Update: {
          actions_executed?: number | null
          actions_failed?: number | null
          actions_succeeded?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          execution_context?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_event?: string
          trigger_type?: string
          triggered_by_user_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string | null
          filter_config: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          schedule_cron: string | null
          schedule_timezone: string | null
          trigger_event: string
          trigger_type: string
          webhook_secret: string | null
          webhook_url: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          schedule_cron?: string | null
          schedule_timezone?: string | null
          trigger_event: string
          trigger_type: string
          webhook_secret?: string | null
          webhook_url?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          schedule_cron?: string | null
          schedule_timezone?: string | null
          trigger_event?: string
          trigger_type?: string
          webhook_secret?: string | null
          webhook_url?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          execution_count: number | null
          execution_order: string | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          last_executed_at: string | null
          max_retries: number | null
          name: string
          retry_on_failure: boolean | null
          success_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          execution_order?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_executed_at?: string | null
          max_retries?: number | null
          name: string
          retry_on_failure?: boolean | null
          success_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          execution_order?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_executed_at?: string | null
          max_retries?: number | null
          name?: string
          retry_on_failure?: boolean | null
          success_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      add_subscriber_to_funnel:
        | {
            Args: { p_email: string; p_funnel_id: string; p_source?: string }
            Returns: string
          }
        | {
            Args: {
              p_email: string
              p_first_name?: string
              p_funnel_id: string
              p_last_name?: string
              p_source?: string
            }
            Returns: string
          }
      apply_referral_code: {
        Args: {
          p_code: string
          p_referee_email: string
          p_referee_name?: string
        }
        Returns: string
      }
      apply_retention_policy: { Args: { p_policy_id: string }; Returns: number }
      calculate_cohort_retention: {
        Args: { p_cohort: string; p_cohort_type?: string }
        Returns: {
          active_users: number
          cohort_size: number
          period: number
          retention_rate: number
        }[]
      }
      calculate_critical_path: { Args: { p_project_id: string }; Returns: Json }
      calculate_engagement_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_enhanced_lead_score: {
        Args: { p_lead_id: string }
        Returns: Json
      }
      calculate_health_score: { Args: { p_user_id: string }; Returns: number }
      calculate_incident_metrics: {
        Args: { p_incident_id: string }
        Returns: undefined
      }
      calculate_lead_score: { Args: { p_lead_id: string }; Returns: number }
      calculate_next_generation_time: {
        Args: { frequency: string; generation_time: string; timezone?: string }
        Returns: string
      }
      calculate_overall_risk_score: {
        Args: {
          p_budget_risk: number
          p_delay_risk: number
          p_quality_risk: number
          p_safety_risk: number
        }
        Returns: number
      }
      calculate_project_completion: {
        Args: { p_project_id: string }
        Returns: number
      }
      calculate_project_profit: {
        Args: { project_id: string }
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
      calculate_user_health_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      can_add_tenant_user: { Args: { p_tenant_id: string }; Returns: boolean }
      can_user_receive_trigger: {
        Args: { p_rule_id: string; p_user_id: string }
        Returns: boolean
      }
      check_equipment_availability:
        | {
            Args: {
              p_end_date: string
              p_equipment_id: string
              p_start_date: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_end_date: string
              p_equipment_id: string
              p_exclude_assignment_id?: string
              p_requested_quantity?: number
              p_start_date: string
            }
            Returns: Json
          }
      check_project_requirements: {
        Args: { p_contract_value: number; p_project_id: string }
        Returns: Json
      }
      check_rate_limit:
        | {
            Args: {
              p_action: string
              p_limit_per_hour?: number
              p_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_endpoint: string
              p_identifier: string
              p_identifier_type: string
              p_ip_address?: unknown
              p_method: string
            }
            Returns: Json
          }
      check_type_exists: { Args: { type_name: string }; Returns: boolean }
      clock_in_with_gps: {
        Args: {
          p_accuracy: number
          p_device_type: string
          p_latitude: number
          p_longitude: number
          p_project_id: string
          p_time_entry_id: string
          p_user_id: string
        }
        Returns: string
      }
      create_audit_log: {
        Args: {
          p_action: string
          p_event_type: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_name?: string
          p_resource_type: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: string
      }
      create_company_affiliate_code: {
        Args: { p_company_id: string }
        Returns: string
      }
      create_document_version:
        | {
            Args: { p_document_id: string; p_version_data: Json }
            Returns: string
          }
        | {
            Args: {
              p_checksum?: string
              p_document_id: string
              p_file_path: string
              p_file_size: number
              p_version_notes?: string
            }
            Returns: string
          }
      create_user_session: {
        Args: {
          p_auth_method?: string
          p_device_info: Json
          p_ip_address: string
          p_sso_connection_id?: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: string
      }
      create_webhook_event: {
        Args: {
          p_action: string
          p_event_type: string
          p_payload: Json
          p_resource_id: string
          p_resource_type: string
          p_tenant_id: string
          p_triggered_by?: string
        }
        Returns: string
      }
      decrypt_stripe_key: { Args: { encrypted_key: string }; Returns: string }
      generate_affiliate_code: { Args: never; Returns: string }
      generate_api_key: { Args: never; Returns: string }
      generate_claim_number: { Args: never; Returns: string }
      generate_compliance_summary: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: Json
      }
      generate_estimate_number: { Args: never; Returns: string }
      generate_po_number:
        | { Args: never; Returns: string }
        | { Args: { company_uuid: string }; Returns: string }
      generate_work_order_number: { Args: never; Returns: string }
      get_active_promotions:
        | {
            Args: never
            Returns: {
              description: string
              discount_percentage: number
              id: string
              name: string
            }[]
          }
        | {
            Args: { p_display_location?: string }
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
      get_active_risk_alerts_count: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_active_session_count: { Args: { p_user_id: string }; Returns: number }
      get_distance_meters: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number }
        Returns: number
      }
      get_equipment_schedule:
        | {
            Args: {
              p_end_date?: string
              p_equipment_id: string
              p_start_date?: string
            }
            Returns: {
              end_date: string
              project_name: string
              schedule_id: string
              start_date: string
              status: string
            }[]
          }
        | {
            Args: {
              p_company_id: string
              p_end_date?: string
              p_equipment_id?: string
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
      get_onboarding_completion_rate: {
        Args: never
        Returns: {
          average_points: number
          average_tasks_completed: number
          completed_users: number
          completion_rate: number
          total_users: number
        }[]
      }
      get_popular_endpoints: {
        Args: { p_limit?: number }
        Returns: {
          avg_response_time_ms: number
          endpoint_path: string
          http_method: string
          request_count: number
          success_rate: number
        }[]
      }
      get_project_geofence: { Args: { p_project_id: string }; Returns: string }
      get_referral_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          email: string
          first_name: string
          last_name: string
          successful_referrals: number
          total_referrals: number
          total_rewards: number
          user_id: string
        }[]
      }
      get_resource_audit_trail: {
        Args: {
          p_limit?: number
          p_resource_id: string
          p_resource_type: string
        }
        Returns: {
          action: string
          changes: Json
          created_at: string
          event_type: string
          id: string
          user_email: string
        }[]
      }
      get_retention_curve: {
        Args: { p_cohort_type?: string; p_period_count?: number }
        Returns: {
          cohort: string
          periods: Json
        }[]
      }
      get_risk_level: { Args: { p_score: number }; Returns: string }
      get_role_permissions:
        | {
            Args: { p_role: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_role_permissions(p_role => text), public.get_role_permissions(p_role => user_role). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_role: Database["public"]["Enums"]["user_role"] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_role_permissions(p_role => text), public.get_role_permissions(p_role => user_role). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      get_smtp_config: { Args: never; Returns: Json }
      get_task_completion_stats: {
        Args: never
        Returns: {
          completion_count: number
          completion_rate: number
          task_id: string
        }[]
      }
      get_tenant_current_usage: {
        Args: { p_tenant_id: string }
        Returns: {
          current_projects: number
          current_users: number
          max_projects: number
          max_storage_gb: number
          max_users: number
          storage_used_gb: number
        }[]
      }
      get_trigger_analytics: {
        Args: { p_end_date?: string; p_rule_id?: string; p_start_date?: string }
        Returns: {
          action_rate: number
          actions_taken: number
          avg_execution_time_ms: number
          failed_executions: number
          rule_id: string
          rule_name: string
          skipped_executions: number
          success_rate: number
          successful_executions: number
          total_executions: number
          unique_users: number
        }[]
      }
      get_triggers_for_event: {
        Args: { p_event_name: string; p_user_id: string }
        Returns: {
          action_config: Json
          action_type: string
          priority: number
          rule_id: string
          rule_name: string
        }[]
      }
      get_user_active_integrations: {
        Args: { p_user_id: string }
        Returns: {
          app_category: string
          app_name: string
          app_slug: string
          last_sync_at: string
          status: string
          sync_enabled: boolean
        }[]
      }
      get_user_active_workflows: {
        Args: { p_user_id: string }
        Returns: {
          category: string
          execution_count: number
          success_rate: number
          workflow_id: string
          workflow_name: string
        }[]
      }
      get_user_company: { Args: { user_id: string }; Returns: string }
      get_user_location_summary: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          average_accuracy: number
          entries_outside_geofence: number
          entries_within_geofence: number
          total_distance_meters: number
          total_entries: number
        }[]
      }
      get_user_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_referral_stats: {
        Args: { p_user_id: string }
        Returns: {
          conversion_rate: number
          pending_referrals: number
          successful_referrals: number
          total_referrals: number
          total_rewards_earned: number
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant: { Args: { p_user_id: string }; Returns: string }
      get_user_tenant_id: { Args: never; Returns: string }
      get_webhook_stats: {
        Args: { p_days?: number; p_endpoint_id: string }
        Returns: {
          avg_response_time_ms: number
          date: string
          failed_deliveries: number
          successful_deliveries: number
          total_deliveries: number
        }[]
      }
      grant_root_admin_complimentary: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      handle_failed_login:
        | { Args: { p_user_id: string }; Returns: undefined }
        | {
            Args: {
              p_ip_address?: unknown
              p_user_agent?: string
              p_user_id: string
            }
            Returns: boolean
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_access: { Args: { check_tenant_id: string }; Returns: boolean }
      increment_article_view_count:
        | { Args: { p_article_id: string }; Returns: undefined }
        | {
            Args: {
              article_id_param: string
              ip_address_param?: unknown
              user_agent_param?: string
              user_id_param?: string
            }
            Returns: undefined
          }
      is_account_locked: { Args: { p_user_id: string }; Returns: boolean }
      is_channel_admin: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_admin: { Args: never; Returns: boolean }
      is_user_unsubscribed: {
        Args: { p_email: string; p_type?: string }
        Returns: boolean
      }
      is_within_geofence: {
        Args: { p_geofence_id: string; p_lat: number; p_lng: number }
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
      log_audit_event:
        | {
            Args: {
              p_new_values?: Json
              p_old_values?: Json
              p_operation: string
              p_record_id: string
              p_table_name: string
            }
            Returns: undefined
          }
        | {
            Args: {
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
            Returns: string
          }
      log_consent_withdrawal: {
        Args: { p_consent_type: string; p_user_id: string }
        Returns: undefined
      }
      log_data_access:
        | {
            Args: {
              p_access_type: string
              p_record_id: string
              p_table_name: string
            }
            Returns: undefined
          }
        | {
            Args: {
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
            Returns: string
          }
      log_security_event:
        | {
            Args: {
              p_details?: Json
              p_event_type: string
              p_ip_address?: unknown
              p_user_agent?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_description?: string
              p_event_type: string
              p_ip_address?: unknown
              p_location?: string
              p_metadata?: Json
              p_severity?: string
              p_user_agent?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: { p_details?: Json; p_event_type: string }
            Returns: undefined
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
      publish_scheduled_blog_posts: { Args: never; Returns: number }
      queue_next_blog_generation: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      reset_failed_attempts:
        | { Args: { p_user_id: string }; Returns: undefined }
        | {
            Args: {
              p_ip_address?: unknown
              p_user_agent?: string
              p_user_id: string
            }
            Returns: undefined
          }
      revoke_all_user_sessions: { Args: { p_user_id: string }; Returns: number }
      search_documentation: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          category: string
          description: string
          id: string
          relevance: number
          slug: string
          title: string
        }[]
      }
      track_user_event: {
        Args: {
          p_event_name: string
          p_event_properties?: Json
          p_user_id: string
        }
        Returns: string
      }
      trigger_security_alert:
        | {
            Args: {
              p_alert_type: string
              p_details?: Json
              p_severity?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_affected_resources?: Json
              p_alert_type: string
              p_company_id: string
              p_description?: string
              p_event_data?: Json
              p_severity: string
              p_title: string
            }
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
      validate_post_for_platform:
        | {
            Args: { p_platform: string; p_post_content: string }
            Returns: Json
          }
        | {
            Args: {
              p_content: string
              p_media_urls?: Json
              p_platform: Database["public"]["Enums"]["social_platform"]
            }
            Returns: Json
          }
      verify_audit_log_chain: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_tenant_id: string
        }
        Returns: {
          broken_at: string
          is_valid: boolean
          total_logs: number
          verified_logs: number
        }[]
      }
      verify_mfa_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
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
