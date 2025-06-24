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
      ai_context_learning: {
        Row: {
          confidence_score: number
          context_type: string
          created_at: string
          effectiveness_rating: number | null
          id: string
          last_validation: string | null
          lead_id: string
          learned_pattern: Json
          sample_size: number
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          context_type: string
          created_at?: string
          effectiveness_rating?: number | null
          id?: string
          last_validation?: string | null
          lead_id: string
          learned_pattern: Json
          sample_size?: number
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          context_type?: string
          created_at?: string
          effectiveness_rating?: number | null
          id?: string
          last_validation?: string | null
          lead_id?: string
          learned_pattern?: Json
          sample_size?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_context_learning_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_context: {
        Row: {
          context_score: number | null
          conversation_summary: string | null
          created_at: string
          id: string
          key_topics: string[] | null
          last_interaction_type: string | null
          lead_id: string
          lead_preferences: Json | null
          response_style: string | null
          updated_at: string
        }
        Insert: {
          context_score?: number | null
          conversation_summary?: string | null
          created_at?: string
          id?: string
          key_topics?: string[] | null
          last_interaction_type?: string | null
          lead_id: string
          lead_preferences?: Json | null
          response_style?: string | null
          updated_at?: string
        }
        Update: {
          context_score?: number | null
          conversation_summary?: string | null
          created_at?: string
          id?: string
          key_topics?: string[] | null
          last_interaction_type?: string | null
          lead_id?: string
          lead_preferences?: Json | null
          response_style?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_context_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_notes: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          lead_id: string
          note_content: string
          note_type: string
          vehicles_discussed: Json | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          note_content: string
          note_type?: string
          vehicles_discussed?: Json | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          note_content?: string
          note_type?: string
          vehicles_discussed?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_emergency_settings: {
        Row: {
          ai_disabled: boolean
          created_at: string
          disable_reason: string | null
          disabled_at: string | null
          disabled_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          ai_disabled?: boolean
          created_at?: string
          disable_reason?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          ai_disabled?: boolean
          created_at?: string
          disable_reason?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_learning_insights: {
        Row: {
          actionable: boolean
          applies_globally: boolean
          confidence_score: number
          created_at: string
          expires_at: string | null
          id: string
          impact_level: string
          implemented: boolean
          insight_data: Json | null
          insight_description: string
          insight_title: string
          insight_type: string
          last_validated_at: string | null
          lead_id: string | null
        }
        Insert: {
          actionable?: boolean
          applies_globally?: boolean
          confidence_score?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          impact_level?: string
          implemented?: boolean
          insight_data?: Json | null
          insight_description: string
          insight_title: string
          insight_type: string
          last_validated_at?: string | null
          lead_id?: string | null
        }
        Update: {
          actionable?: boolean
          applies_globally?: boolean
          confidence_score?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          impact_level?: string
          implemented?: boolean
          insight_data?: Json | null
          insight_description?: string
          insight_title?: string
          insight_type?: string
          last_validated_at?: string | null
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_learning_metrics: {
        Row: {
          average_confidence_score: number | null
          conversion_rate_improvement: number | null
          created_at: string
          id: string
          learning_events_processed: number
          metric_date: string
          optimization_triggers: number
          response_rate_improvement: number | null
          successful_interactions: number
          template_improvements: number
          total_interactions: number
        }
        Insert: {
          average_confidence_score?: number | null
          conversion_rate_improvement?: number | null
          created_at?: string
          id?: string
          learning_events_processed?: number
          metric_date?: string
          optimization_triggers?: number
          response_rate_improvement?: number | null
          successful_interactions?: number
          template_improvements?: number
          total_interactions?: number
        }
        Update: {
          average_confidence_score?: number | null
          conversion_rate_improvement?: number | null
          created_at?: string
          id?: string
          learning_events_processed?: number
          metric_date?: string
          optimization_triggers?: number
          response_rate_improvement?: number | null
          successful_interactions?: number
          template_improvements?: number
          total_interactions?: number
        }
        Relationships: []
      }
      ai_learning_outcomes: {
        Row: {
          conversation_quality_score: number | null
          created_at: string
          days_to_outcome: number | null
          id: string
          inventory_context: Json | null
          lead_characteristics: Json | null
          lead_id: string
          message_characteristics: Json | null
          message_id: string | null
          outcome_type: string
          outcome_value: number | null
          seasonal_context: Json | null
          success_factors: Json | null
        }
        Insert: {
          conversation_quality_score?: number | null
          created_at?: string
          days_to_outcome?: number | null
          id?: string
          inventory_context?: Json | null
          lead_characteristics?: Json | null
          lead_id: string
          message_characteristics?: Json | null
          message_id?: string | null
          outcome_type: string
          outcome_value?: number | null
          seasonal_context?: Json | null
          success_factors?: Json | null
        }
        Update: {
          conversation_quality_score?: number | null
          created_at?: string
          days_to_outcome?: number | null
          id?: string
          inventory_context?: Json | null
          lead_characteristics?: Json | null
          lead_id?: string
          message_characteristics?: Json | null
          message_id?: string | null
          outcome_type?: string
          outcome_value?: number | null
          seasonal_context?: Json | null
          success_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_outcomes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_outcomes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_message_analytics: {
        Row: {
          created_at: string
          day_of_week: number | null
          hour_of_day: number | null
          id: string
          inventory_mentioned: Json | null
          lead_id: string
          message_content: string
          message_stage: string
          responded_at: string | null
          response_time_hours: number | null
          sent_at: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          hour_of_day?: number | null
          id?: string
          inventory_mentioned?: Json | null
          lead_id: string
          message_content: string
          message_stage: string
          responded_at?: string | null
          response_time_hours?: number | null
          sent_at?: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          hour_of_day?: number | null
          id?: string
          inventory_mentioned?: Json | null
          lead_id?: string
          message_content?: string
          message_stage?: string
          responded_at?: string | null
          response_time_hours?: number | null
          sent_at?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ai_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_message_approval_queue: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          auto_approved: boolean
          created_at: string
          id: string
          lead_id: string
          message_content: string
          message_stage: string
          rejected: boolean
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          scheduled_send_at: string
          sent_at: string | null
          updated_at: string
          urgency_level: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean
          created_at?: string
          id?: string
          lead_id: string
          message_content: string
          message_stage?: string
          rejected?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          scheduled_send_at: string
          sent_at?: string | null
          updated_at?: string
          urgency_level?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean
          created_at?: string
          id?: string
          lead_id?: string
          message_content?: string
          message_stage?: string
          rejected?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          scheduled_send_at?: string
          sent_at?: string | null
          updated_at?: string
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_approval_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_message_feedback: {
        Row: {
          conversation_id: string | null
          conversion_outcome: string | null
          created_at: string
          created_by: string | null
          feedback_type: string
          human_takeover_triggered: boolean | null
          id: string
          improvement_suggestions: string | null
          issue_category: string | null
          lead_id: string
          message_content: string
          rating: number | null
          regeneration_reason: string | null
          response_received: boolean | null
          response_time_hours: number | null
        }
        Insert: {
          conversation_id?: string | null
          conversion_outcome?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type: string
          human_takeover_triggered?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          issue_category?: string | null
          lead_id: string
          message_content: string
          rating?: number | null
          regeneration_reason?: string | null
          response_received?: boolean | null
          response_time_hours?: number | null
        }
        Update: {
          conversation_id?: string | null
          conversion_outcome?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type?: string
          human_takeover_triggered?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          issue_category?: string | null
          lead_id?: string
          message_content?: string
          rating?: number | null
          regeneration_reason?: string | null
          response_received?: boolean | null
          response_time_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_message_feedback_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_message_history: {
        Row: {
          context_data: Json | null
          created_at: string
          id: string
          lead_id: string
          message_content: string
          message_hash: string
          sent_at: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string
          id?: string
          lead_id: string
          message_content: string
          message_hash: string
          sent_at?: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string
          id?: string
          lead_id?: string
          message_content?: string
          message_hash?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_message_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          response_rate: number | null
          stage: string
          template: string
          total_responses: number | null
          total_sent: number | null
          updated_at: string
          variant_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          response_rate?: number | null
          stage: string
          template: string
          total_responses?: number | null
          total_sent?: number | null
          updated_at?: string
          variant_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          response_rate?: number | null
          stage?: string
          template?: string
          total_responses?: number | null
          total_sent?: number | null
          updated_at?: string
          variant_name?: string
        }
        Relationships: []
      }
      ai_prompt_evolution: {
        Row: {
          activated_at: string | null
          approved_for_production: boolean | null
          created_at: string
          deactivated_at: string | null
          id: string
          improvement_percentage: number | null
          optimization_reason: string | null
          optimized_prompt: string
          original_prompt: string
          performance_after: Json | null
          performance_before: Json | null
          prompt_type: string
          rollback_reason: string | null
          sample_size: number | null
          test_duration_days: number | null
        }
        Insert: {
          activated_at?: string | null
          approved_for_production?: boolean | null
          created_at?: string
          deactivated_at?: string | null
          id?: string
          improvement_percentage?: number | null
          optimization_reason?: string | null
          optimized_prompt: string
          original_prompt: string
          performance_after?: Json | null
          performance_before?: Json | null
          prompt_type: string
          rollback_reason?: string | null
          sample_size?: number | null
          test_duration_days?: number | null
        }
        Update: {
          activated_at?: string | null
          approved_for_production?: boolean | null
          created_at?: string
          deactivated_at?: string | null
          id?: string
          improvement_percentage?: number | null
          optimization_reason?: string | null
          optimized_prompt?: string
          original_prompt?: string
          performance_after?: Json | null
          performance_before?: Json | null
          prompt_type?: string
          rollback_reason?: string | null
          sample_size?: number | null
          test_duration_days?: number | null
        }
        Relationships: []
      }
      ai_schedule_config: {
        Row: {
          created_at: string
          day_offset: number
          id: string
          is_active: boolean
          messages_per_day: number
          preferred_hours: number[] | null
          stage_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_offset: number
          id?: string
          is_active?: boolean
          messages_per_day?: number
          preferred_hours?: number[] | null
          stage_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_offset?: number
          id?: string
          is_active?: boolean
          messages_per_day?: number
          preferred_hours?: number[] | null
          stage_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_template_performance: {
        Row: {
          conversion_count: number
          conversion_rate: number | null
          created_at: string
          id: string
          last_used_at: string | null
          lead_segment: string | null
          performance_score: number
          positive_responses: number
          response_count: number
          response_rate: number | null
          seasonal_performance: Json | null
          template_content: string
          template_id: string | null
          template_variant: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          conversion_count?: number
          conversion_rate?: number | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          lead_segment?: string | null
          performance_score?: number
          positive_responses?: number
          response_count?: number
          response_rate?: number | null
          seasonal_performance?: Json | null
          template_content: string
          template_id?: string | null
          template_variant: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          conversion_count?: number
          conversion_rate?: number | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          lead_segment?: string | null
          performance_score?: number
          positive_responses?: number
          response_count?: number
          response_rate?: number | null
          seasonal_performance?: Json | null
          template_content?: string
          template_id?: string | null
          template_variant?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_template_performance_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ai_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_trigger_messages: {
        Row: {
          approved: boolean
          generated_at: string
          id: string
          lead_id: string
          message_content: string
          sent_at: string | null
          trigger_id: string | null
          urgency_level: string
        }
        Insert: {
          approved?: boolean
          generated_at?: string
          id?: string
          lead_id: string
          message_content: string
          sent_at?: string | null
          trigger_id?: string | null
          urgency_level?: string
        }
        Update: {
          approved?: boolean
          generated_at?: string
          id?: string
          lead_id?: string
          message_content?: string
          sent_at?: string | null
          trigger_id?: string | null
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_trigger_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_trigger_messages_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "enhanced_behavioral_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_slots: {
        Row: {
          created_at: string | null
          current_bookings: number | null
          date: string
          id: string
          is_available: boolean | null
          max_appointments: number | null
          time_slot: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_bookings?: number | null
          date: string
          id?: string
          is_available?: boolean | null
          max_appointments?: number | null
          time_slot: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_bookings?: number | null
          date?: string
          id?: string
          is_available?: boolean | null
          max_appointments?: number | null
          time_slot?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type: string
          booking_source: string | null
          booking_token: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          follow_up_required: boolean | null
          id: string
          lead_id: string
          location: string | null
          no_show_at: string | null
          notes: string | null
          reminder_sent_at: string | null
          salesperson_id: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          booking_source?: string | null
          booking_token?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          follow_up_required?: boolean | null
          id?: string
          lead_id: string
          location?: string | null
          no_show_at?: string | null
          notes?: string | null
          reminder_sent_at?: string | null
          salesperson_id?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          booking_source?: string | null
          booking_token?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          follow_up_required?: boolean | null
          id?: string
          lead_id?: string
          location?: string | null
          no_show_at?: string | null
          notes?: string | null
          reminder_sent_at?: string | null
          salesperson_id?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitive_analysis: {
        Row: {
          analysis_date: string
          competitive_advantages: Json | null
          competitor_avg_price: number | null
          competitor_count: number | null
          created_at: string
          id: string
          market_share_estimate: number | null
          our_price: number | null
          price_position: string
          updated_at: string
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number | null
        }
        Insert: {
          analysis_date?: string
          competitive_advantages?: Json | null
          competitor_avg_price?: number | null
          competitor_count?: number | null
          created_at?: string
          id?: string
          market_share_estimate?: number | null
          our_price?: number | null
          price_position?: string
          updated_at?: string
          vehicle_make: string
          vehicle_model: string
          vehicle_year?: number | null
        }
        Update: {
          analysis_date?: string
          competitive_advantages?: Json | null
          competitor_avg_price?: number | null
          competitor_count?: number | null
          created_at?: string
          id?: string
          market_share_estimate?: number | null
          our_price?: number | null
          price_position?: string
          updated_at?: string
          vehicle_make?: string
          vehicle_model?: string
          vehicle_year?: number | null
        }
        Relationships: []
      }
      compliance_rules: {
        Row: {
          auto_flag: boolean
          created_at: string
          description: string
          detection_pattern: string | null
          id: string
          is_active: boolean
          rule_name: string
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          auto_flag?: boolean
          created_at?: string
          description: string
          detection_pattern?: string | null
          id?: string
          is_active?: boolean
          rule_name: string
          rule_type: string
          severity?: string
          updated_at?: string
        }
        Update: {
          auto_flag?: boolean
          created_at?: string
          description?: string
          detection_pattern?: string | null
          id?: string
          is_active?: boolean
          rule_name?: string
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_settings: {
        Row: {
          email_disclaimer: string | null
          id: string
          message_window_end: string
          message_window_start: string
          policy_links: Json | null
          sms_disclaimer: string | null
          updated_at: string
        }
        Insert: {
          email_disclaimer?: string | null
          id?: string
          message_window_end?: string
          message_window_start?: string
          policy_links?: Json | null
          sms_disclaimer?: string | null
          updated_at?: string
        }
        Update: {
          email_disclaimer?: string | null
          id?: string
          message_window_end?: string
          message_window_start?: string
          policy_links?: Json | null
          sms_disclaimer?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compliance_suppression_list: {
        Row: {
          contact: string
          details: string | null
          id: string
          lead_id: string | null
          reason: string | null
          suppressed_at: string
          type: string
        }
        Insert: {
          contact: string
          details?: string | null
          id?: string
          lead_id?: string | null
          reason?: string | null
          suppressed_at?: string
          type: string
        }
        Update: {
          contact?: string
          details?: string | null
          id?: string
          lead_id?: string | null
          reason?: string | null
          suppressed_at?: string
          type?: string
        }
        Relationships: []
      }
      compliance_violations: {
        Row: {
          confidence_score: number
          conversation_id: string
          created_at: string
          description: string
          detected_content: string
          id: string
          lead_id: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          violation_type: string
        }
        Insert: {
          confidence_score?: number
          conversation_id: string
          created_at?: string
          description: string
          detected_content: string
          id?: string
          lead_id: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          violation_type: string
        }
        Update: {
          confidence_score?: number
          conversation_id?: string
          created_at?: string
          description?: string
          detected_content?: string
          id?: string
          lead_id?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_violations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_memory: {
        Row: {
          behavioral_patterns: Json | null
          confidence: number | null
          content: string
          conversation_history: Json | null
          created_at: string
          current_session_id: string | null
          customer_profile: Json | null
          emotional_context: Json | null
          id: string
          lead_id: string
          memory_type: string
          updated_at: string
        }
        Insert: {
          behavioral_patterns?: Json | null
          confidence?: number | null
          content: string
          conversation_history?: Json | null
          created_at?: string
          current_session_id?: string | null
          customer_profile?: Json | null
          emotional_context?: Json | null
          id?: string
          lead_id: string
          memory_type: string
          updated_at?: string
        }
        Update: {
          behavioral_patterns?: Json | null
          confidence?: number | null
          content?: string
          conversation_history?: Json | null
          created_at?: string
          current_session_id?: string | null
          customer_profile?: Json | null
          emotional_context?: Json | null
          id?: string
          lead_id?: string
          memory_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_memory_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_quality_scores: {
        Row: {
          close_attempt_score: number
          conversation_id: string
          created_at: string
          engagement_score: number
          id: string
          improvement_areas: Json | null
          lead_id: string
          overall_score: number
          professionalism_score: number
          quality_factors: Json | null
          response_time_score: number
          salesperson_id: string | null
          sentiment_progression_score: number
          updated_at: string
        }
        Insert: {
          close_attempt_score?: number
          conversation_id: string
          created_at?: string
          engagement_score?: number
          id?: string
          improvement_areas?: Json | null
          lead_id: string
          overall_score?: number
          professionalism_score?: number
          quality_factors?: Json | null
          response_time_score?: number
          salesperson_id?: string | null
          sentiment_progression_score?: number
          updated_at?: string
        }
        Update: {
          close_attempt_score?: number
          conversation_id?: string
          created_at?: string
          engagement_score?: number
          id?: string
          improvement_areas?: Json | null
          lead_id?: string
          overall_score?: number
          professionalism_score?: number
          quality_factors?: Json | null
          response_time_score?: number
          salesperson_id?: string | null
          sentiment_progression_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_quality_scores_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_quality_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_quality_scores_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          created_at: string
          id: string
          key_points: Json | null
          last_message_at: string | null
          lead_id: string
          message_count: number
          summary_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_points?: Json | null
          last_message_at?: string | null
          lead_id: string
          message_count?: number
          summary_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_points?: Json | null
          last_message_at?: string | null
          lead_id?: string
          message_count?: number
          summary_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_generated: boolean
          body: string
          created_at: string
          direction: string
          id: string
          lead_id: string
          profile_id: string | null
          read_at: string | null
          sent_at: string
          sms_error: string | null
          sms_status: string | null
          twilio_message_id: string | null
        }
        Insert: {
          ai_generated?: boolean
          body: string
          created_at?: string
          direction: string
          id?: string
          lead_id: string
          profile_id?: string | null
          read_at?: string | null
          sent_at?: string
          sms_error?: string | null
          sms_status?: string | null
          twilio_message_id?: string | null
        }
        Update: {
          ai_generated?: boolean
          body?: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string
          profile_id?: string | null
          read_at?: string | null
          sent_at?: string
          sms_error?: string | null
          sms_status?: string | null
          twilio_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_journeys: {
        Row: {
          conversion_probability: number | null
          created_at: string | null
          estimated_time_to_decision: number | null
          id: string
          journey_stage: string
          lead_id: string
          milestones: Json | null
          next_best_action: string | null
          touchpoints: Json | null
          updated_at: string | null
        }
        Insert: {
          conversion_probability?: number | null
          created_at?: string | null
          estimated_time_to_decision?: number | null
          id?: string
          journey_stage?: string
          lead_id: string
          milestones?: Json | null
          next_best_action?: string | null
          touchpoints?: Json | null
          updated_at?: string | null
        }
        Update: {
          conversion_probability?: number | null
          created_at?: string | null
          estimated_time_to_decision?: number | null
          id?: string
          journey_stage?: string
          lead_id?: string
          milestones?: Json | null
          next_best_action?: string | null
          touchpoints?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_journeys_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_profit_history: {
        Row: {
          change_type: string
          created_at: string
          deal_id: string
          fi_profit: number | null
          gross_profit: number | null
          id: string
          pack_adjustment_applied: number | null
          snapshot_date: string
          stock_number: string | null
          total_profit: number | null
          upload_history_id: string | null
        }
        Insert: {
          change_type?: string
          created_at?: string
          deal_id: string
          fi_profit?: number | null
          gross_profit?: number | null
          id?: string
          pack_adjustment_applied?: number | null
          snapshot_date?: string
          stock_number?: string | null
          total_profit?: number | null
          upload_history_id?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          deal_id?: string
          fi_profit?: number | null
          gross_profit?: number | null
          id?: string
          pack_adjustment_applied?: number | null
          snapshot_date?: string
          stock_number?: string | null
          total_profit?: number | null
          upload_history_id?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          age: number | null
          buyer_name: string | null
          cost_amount: number | null
          created_at: string
          deal_type: string | null
          deal_type_locked: boolean | null
          fi_profit: number | null
          first_reported_date: string | null
          gross_profit: number | null
          id: string
          original_fi_profit: number | null
          original_gross_profit: number | null
          original_total_profit: number | null
          sale_amount: number | null
          stock_number: string | null
          total_profit: number | null
          updated_at: string
          upload_date: string
          upload_history_id: string | null
          year_model: string | null
        }
        Insert: {
          age?: number | null
          buyer_name?: string | null
          cost_amount?: number | null
          created_at?: string
          deal_type?: string | null
          deal_type_locked?: boolean | null
          fi_profit?: number | null
          first_reported_date?: string | null
          gross_profit?: number | null
          id?: string
          original_fi_profit?: number | null
          original_gross_profit?: number | null
          original_total_profit?: number | null
          sale_amount?: number | null
          stock_number?: string | null
          total_profit?: number | null
          updated_at?: string
          upload_date: string
          upload_history_id?: string | null
          year_model?: string | null
        }
        Update: {
          age?: number | null
          buyer_name?: string | null
          cost_amount?: number | null
          created_at?: string
          deal_type?: string | null
          deal_type_locked?: boolean | null
          fi_profit?: number | null
          first_reported_date?: string | null
          gross_profit?: number | null
          id?: string
          original_fi_profit?: number | null
          original_gross_profit?: number | null
          original_total_profit?: number | null
          sale_amount?: number | null
          stock_number?: string | null
          total_profit?: number | null
          updated_at?: string
          upload_date?: string
          upload_history_id?: string | null
          year_model?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          total_bounced: number | null
          total_clicked: number | null
          total_delivered: number | null
          total_opened: number | null
          total_recipients: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_conversation_analysis: {
        Row: {
          analyzed_at: string
          created_at: string
          email_conversation_id: string
          id: string
          intent: string[] | null
          key_phrases: string[] | null
          sentiment: string
          urgency_level: string
        }
        Insert: {
          analyzed_at?: string
          created_at?: string
          email_conversation_id: string
          id?: string
          intent?: string[] | null
          key_phrases?: string[] | null
          sentiment?: string
          urgency_level?: string
        }
        Update: {
          analyzed_at?: string
          created_at?: string
          email_conversation_id?: string
          id?: string
          intent?: string[] | null
          key_phrases?: string[] | null
          sentiment?: string
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_conversation_analysis_email_conversation_id_fkey"
            columns: ["email_conversation_id"]
            isOneToOne: false
            referencedRelation: "email_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_conversations: {
        Row: {
          body: string
          bounced_at: string | null
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          direction: string
          email_error: string | null
          email_status: string | null
          id: string
          lead_id: string
          opened_at: string | null
          read_at: string | null
          resend_message_id: string | null
          sent_at: string
          subject: string
          template_id: string | null
        }
        Insert: {
          body: string
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          direction: string
          email_error?: string | null
          email_status?: string | null
          id?: string
          lead_id: string
          opened_at?: string | null
          read_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          body?: string
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          email_error?: string | null
          email_status?: string | null
          id?: string
          lead_id?: string
          opened_at?: string | null
          read_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_conversations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          created_at: string
          default_from_email: string | null
          default_from_name: string | null
          id: string
          signature: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_from_email?: string | null
          default_from_name?: string | null
          id?: string
          signature?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_from_email?: string | null
          default_from_name?: string | null
          id?: string
          signature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      enhanced_behavioral_triggers: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          processed: boolean
          trigger_data: Json | null
          trigger_score: number
          trigger_type: string
          urgency_level: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          processed?: boolean
          trigger_data?: Json | null
          trigger_score?: number
          trigger_type: string
          urgency_level?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          processed?: boolean
          trigger_data?: Json | null
          trigger_score?: number
          trigger_type?: string
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_behavioral_triggers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_messages: {
        Row: {
          content: string
          created_at: string
          direction: string
          id: string
          lead_id: string | null
          message_metadata: Json | null
          original_message_id: string | null
          sent_at: string
          source_system: string
        }
        Insert: {
          content: string
          created_at?: string
          direction: string
          id?: string
          lead_id?: string | null
          message_metadata?: Json | null
          original_message_id?: string | null
          sent_at: string
          source_system?: string
        }
        Update: {
          content?: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string | null
          message_metadata?: Json | null
          original_message_id?: string | null
          sent_at?: string
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          accidents_reported: number | null
          acquisition_date: string | null
          actual_delivery_date: string | null
          age_group: string | null
          allocation_code: string | null
          body_style: string | null
          book_value: number | null
          build_week: string | null
          carfax_url: string | null
          cash_down_payment: number | null
          certification_type: string | null
          color_exterior: string | null
          color_interior: string | null
          condition: string
          created_at: string
          customer_name: string | null
          customer_order_number: string | null
          days_in_inventory: number | null
          dealer_notes: string | null
          dealer_order_code: string | null
          dealer_pack: number | null
          delivery_method: string | null
          delivery_variance_days: number | null
          demand_score: number | null
          description: string | null
          detailed_done: boolean | null
          drivetrain: string | null
          engine: string | null
          estimated_delivery_date: string | null
          expected_sale_date: string | null
          factory_warranty_remaining: boolean | null
          features: string[] | null
          finance_payment: number | null
          first_seen_at: string | null
          fuel_type: string | null
          full_option_blob: Json | null
          gm_model_code: string | null
          gm_order_number: string | null
          gm_status_description: string | null
          holdback: number | null
          id: string
          images: string[] | null
          incentives: number | null
          internet_price: number | null
          invoice: number | null
          invoice_cost: number | null
          key_count: number | null
          last_seen_at: string | null
          leads_count: number | null
          lease_payment: number | null
          lien_holder: string | null
          location: string | null
          lot_location: string | null
          make: string
          mileage: number | null
          model: string
          msrp: number | null
          order_date: string | null
          order_priority: string | null
          order_source: string | null
          order_type: string | null
          original_order_date: string | null
          pack: number | null
          photos_done: boolean | null
          photos_urls: string[] | null
          plant_code: string | null
          predicted_sale_date: string | null
          previous_owners: number | null
          price: number | null
          price_competitiveness: string | null
          priority_code: string | null
          production_sequence: string | null
          profit_margin: number | null
          rebates: number | null
          reconditioning_cost: number | null
          revised_delivery_date: string | null
          rpo_codes: string[] | null
          rpo_descriptions: string[] | null
          sales_rep: string | null
          selling_dealer_code: string | null
          service_done: boolean | null
          service_records_available: boolean | null
          ship_to_dealer_code: string | null
          sold_at: string | null
          source_acquired: string | null
          source_report:
            | Database["public"]["Enums"]["source_report_type"]
            | null
          special_equipment: string | null
          status: string
          stock_number: string | null
          title_status: string | null
          trade_hold_status: string | null
          trade_value: number | null
          transmission: string | null
          trim: string | null
          turn_goal_days: number | null
          updated_at: string
          upload_history_id: string | null
          vehicle_history_report: string | null
          velocity_category: string | null
          vin: string | null
          warranty_miles: number | null
          warranty_months: number | null
          warranty_type: string | null
          wholesale_cost: number | null
          window_sticker_url: string | null
          year: number | null
        }
        Insert: {
          accidents_reported?: number | null
          acquisition_date?: string | null
          actual_delivery_date?: string | null
          age_group?: string | null
          allocation_code?: string | null
          body_style?: string | null
          book_value?: number | null
          build_week?: string | null
          carfax_url?: string | null
          cash_down_payment?: number | null
          certification_type?: string | null
          color_exterior?: string | null
          color_interior?: string | null
          condition?: string
          created_at?: string
          customer_name?: string | null
          customer_order_number?: string | null
          days_in_inventory?: number | null
          dealer_notes?: string | null
          dealer_order_code?: string | null
          dealer_pack?: number | null
          delivery_method?: string | null
          delivery_variance_days?: number | null
          demand_score?: number | null
          description?: string | null
          detailed_done?: boolean | null
          drivetrain?: string | null
          engine?: string | null
          estimated_delivery_date?: string | null
          expected_sale_date?: string | null
          factory_warranty_remaining?: boolean | null
          features?: string[] | null
          finance_payment?: number | null
          first_seen_at?: string | null
          fuel_type?: string | null
          full_option_blob?: Json | null
          gm_model_code?: string | null
          gm_order_number?: string | null
          gm_status_description?: string | null
          holdback?: number | null
          id?: string
          images?: string[] | null
          incentives?: number | null
          internet_price?: number | null
          invoice?: number | null
          invoice_cost?: number | null
          key_count?: number | null
          last_seen_at?: string | null
          leads_count?: number | null
          lease_payment?: number | null
          lien_holder?: string | null
          location?: string | null
          lot_location?: string | null
          make: string
          mileage?: number | null
          model: string
          msrp?: number | null
          order_date?: string | null
          order_priority?: string | null
          order_source?: string | null
          order_type?: string | null
          original_order_date?: string | null
          pack?: number | null
          photos_done?: boolean | null
          photos_urls?: string[] | null
          plant_code?: string | null
          predicted_sale_date?: string | null
          previous_owners?: number | null
          price?: number | null
          price_competitiveness?: string | null
          priority_code?: string | null
          production_sequence?: string | null
          profit_margin?: number | null
          rebates?: number | null
          reconditioning_cost?: number | null
          revised_delivery_date?: string | null
          rpo_codes?: string[] | null
          rpo_descriptions?: string[] | null
          sales_rep?: string | null
          selling_dealer_code?: string | null
          service_done?: boolean | null
          service_records_available?: boolean | null
          ship_to_dealer_code?: string | null
          sold_at?: string | null
          source_acquired?: string | null
          source_report?:
            | Database["public"]["Enums"]["source_report_type"]
            | null
          special_equipment?: string | null
          status?: string
          stock_number?: string | null
          title_status?: string | null
          trade_hold_status?: string | null
          trade_value?: number | null
          transmission?: string | null
          trim?: string | null
          turn_goal_days?: number | null
          updated_at?: string
          upload_history_id?: string | null
          vehicle_history_report?: string | null
          velocity_category?: string | null
          vin?: string | null
          warranty_miles?: number | null
          warranty_months?: number | null
          warranty_type?: string | null
          wholesale_cost?: number | null
          window_sticker_url?: string | null
          year?: number | null
        }
        Update: {
          accidents_reported?: number | null
          acquisition_date?: string | null
          actual_delivery_date?: string | null
          age_group?: string | null
          allocation_code?: string | null
          body_style?: string | null
          book_value?: number | null
          build_week?: string | null
          carfax_url?: string | null
          cash_down_payment?: number | null
          certification_type?: string | null
          color_exterior?: string | null
          color_interior?: string | null
          condition?: string
          created_at?: string
          customer_name?: string | null
          customer_order_number?: string | null
          days_in_inventory?: number | null
          dealer_notes?: string | null
          dealer_order_code?: string | null
          dealer_pack?: number | null
          delivery_method?: string | null
          delivery_variance_days?: number | null
          demand_score?: number | null
          description?: string | null
          detailed_done?: boolean | null
          drivetrain?: string | null
          engine?: string | null
          estimated_delivery_date?: string | null
          expected_sale_date?: string | null
          factory_warranty_remaining?: boolean | null
          features?: string[] | null
          finance_payment?: number | null
          first_seen_at?: string | null
          fuel_type?: string | null
          full_option_blob?: Json | null
          gm_model_code?: string | null
          gm_order_number?: string | null
          gm_status_description?: string | null
          holdback?: number | null
          id?: string
          images?: string[] | null
          incentives?: number | null
          internet_price?: number | null
          invoice?: number | null
          invoice_cost?: number | null
          key_count?: number | null
          last_seen_at?: string | null
          leads_count?: number | null
          lease_payment?: number | null
          lien_holder?: string | null
          location?: string | null
          lot_location?: string | null
          make?: string
          mileage?: number | null
          model?: string
          msrp?: number | null
          order_date?: string | null
          order_priority?: string | null
          order_source?: string | null
          order_type?: string | null
          original_order_date?: string | null
          pack?: number | null
          photos_done?: boolean | null
          photos_urls?: string[] | null
          plant_code?: string | null
          predicted_sale_date?: string | null
          previous_owners?: number | null
          price?: number | null
          price_competitiveness?: string | null
          priority_code?: string | null
          production_sequence?: string | null
          profit_margin?: number | null
          rebates?: number | null
          reconditioning_cost?: number | null
          revised_delivery_date?: string | null
          rpo_codes?: string[] | null
          rpo_descriptions?: string[] | null
          sales_rep?: string | null
          selling_dealer_code?: string | null
          service_done?: boolean | null
          service_records_available?: boolean | null
          ship_to_dealer_code?: string | null
          sold_at?: string | null
          source_acquired?: string | null
          source_report?:
            | Database["public"]["Enums"]["source_report_type"]
            | null
          special_equipment?: string | null
          status?: string
          stock_number?: string | null
          title_status?: string | null
          trade_hold_status?: string | null
          trade_value?: number | null
          transmission?: string | null
          trim?: string | null
          turn_goal_days?: number | null
          updated_at?: string
          upload_history_id?: string | null
          vehicle_history_report?: string | null
          velocity_category?: string | null
          vin?: string | null
          warranty_miles?: number | null
          warranty_months?: number | null
          warranty_type?: string | null
          wholesale_cost?: number | null
          window_sticker_url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_upload_history_id_fkey"
            columns: ["upload_history_id"]
            isOneToOne: false
            referencedRelation: "upload_history"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_demand_predictions: {
        Row: {
          created_at: string
          demand_score: number
          id: string
          inventory_id: string
          last_calculated_at: string
          market_demand_level: string
          predicted_days_to_sell: number | null
          prediction_accuracy: number | null
          price_competitiveness: string
          seasonal_factor: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          demand_score?: number
          id?: string
          inventory_id: string
          last_calculated_at?: string
          market_demand_level?: string
          predicted_days_to_sell?: number | null
          prediction_accuracy?: number | null
          price_competitiveness?: string
          seasonal_factor?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          demand_score?: number
          id?: string
          inventory_id?: string
          last_calculated_at?: string
          market_demand_level?: string
          predicted_days_to_sell?: number | null
          prediction_accuracy?: number | null
          price_competitiveness?: string
          seasonal_factor?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_demand_predictions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      key_moves: {
        Row: {
          action_type: string | null
          created_at: string
          id: string
          inventory_id: string
          location: string | null
          moved_by: string | null
          notes: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          location?: string | null
          moved_by?: string | null
          notes?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          location?: string | null
          moved_by?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_moves_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_moves_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          cars_sold: number | null
          created_at: string | null
          date: string
          gross_profit: number | null
          leads_created: number | null
          messages_sent: number | null
          replies_in: number | null
          updated_at: string | null
        }
        Insert: {
          cars_sold?: number | null
          created_at?: string | null
          date: string
          gross_profit?: number | null
          leads_created?: number | null
          messages_sent?: number | null
          replies_in?: number | null
          updated_at?: string | null
        }
        Update: {
          cars_sold?: number | null
          created_at?: string | null
          date?: string
          gross_profit?: number | null
          leads_created?: number | null
          messages_sent?: number | null
          replies_in?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_behavior_triggers: {
        Row: {
          created_at: string
          id: string
          is_processed: boolean
          lead_id: string
          message_sent: boolean | null
          trigger_data: Json | null
          trigger_time: string
          trigger_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_processed?: boolean
          lead_id: string
          message_sent?: boolean | null
          trigger_data?: Json | null
          trigger_time?: string
          trigger_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_processed?: boolean
          lead_id?: string
          message_sent?: boolean | null
          trigger_data?: Json | null
          trigger_time?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_behavior_triggers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_communication_patterns: {
        Row: {
          avoidance_patterns: Json | null
          content_preferences: Json | null
          created_at: string
          engagement_triggers: Json | null
          id: string
          last_interaction_at: string | null
          lead_id: string
          learning_confidence: number
          optimal_send_times: Json | null
          preferred_message_length: string | null
          preferred_tone: string | null
          response_patterns: Json | null
          updated_at: string
        }
        Insert: {
          avoidance_patterns?: Json | null
          content_preferences?: Json | null
          created_at?: string
          engagement_triggers?: Json | null
          id?: string
          last_interaction_at?: string | null
          lead_id: string
          learning_confidence?: number
          optimal_send_times?: Json | null
          preferred_message_length?: string | null
          preferred_tone?: string | null
          response_patterns?: Json | null
          updated_at?: string
        }
        Update: {
          avoidance_patterns?: Json | null
          content_preferences?: Json | null
          created_at?: string
          engagement_triggers?: Json | null
          id?: string
          last_interaction_at?: string | null
          lead_id?: string
          learning_confidence?: number
          optimal_send_times?: Json | null
          preferred_message_length?: string | null
          preferred_tone?: string | null
          response_patterns?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_communication_patterns_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_consent_audit: {
        Row: {
          channel: string
          event_at: string
          event_metadata: Json | null
          event_type: string
          id: string
          lead_id: string
          performed_by: string | null
        }
        Insert: {
          channel: string
          event_at?: string
          event_metadata?: Json | null
          event_type: string
          id?: string
          lead_id: string
          performed_by?: string | null
        }
        Update: {
          channel?: string
          event_at?: string
          event_metadata?: Json | null
          event_type?: string
          id?: string
          lead_id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      lead_consent_proof: {
        Row: {
          captured_at: string
          captured_by: string | null
          consent_channel: string
          consent_given: boolean
          consent_method: string
          consent_text: string | null
          id: string
          ip_address: string | null
          lead_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          consent_channel: string
          consent_given?: boolean
          consent_method: string
          consent_text?: string | null
          id?: string
          ip_address?: string | null
          lead_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          consent_channel?: string
          consent_given?: boolean
          consent_method?: string
          consent_text?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      lead_contact_timing: {
        Row: {
          best_contact_days: number[] | null
          best_contact_hours: number[] | null
          id: string
          last_optimal_contact: string | null
          lead_id: string
          response_delay_pattern: number | null
          timezone: string | null
        }
        Insert: {
          best_contact_days?: number[] | null
          best_contact_hours?: number[] | null
          id?: string
          last_optimal_contact?: string | null
          lead_id: string
          response_delay_pattern?: number | null
          timezone?: string | null
        }
        Update: {
          best_contact_days?: number[] | null
          best_contact_hours?: number[] | null
          id?: string
          last_optimal_contact?: string | null
          lead_id?: string
          response_delay_pattern?: number | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_contact_timing_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_conversion_predictions: {
        Row: {
          conversion_probability: number
          created_at: string
          id: string
          last_calculated_at: string
          lead_id: string
          predicted_close_date: string | null
          predicted_sale_amount: number | null
          prediction_factors: Json | null
          temperature_score: number
          updated_at: string
        }
        Insert: {
          conversion_probability?: number
          created_at?: string
          id?: string
          last_calculated_at?: string
          lead_id: string
          predicted_close_date?: string | null
          predicted_sale_amount?: number | null
          prediction_factors?: Json | null
          temperature_score?: number
          updated_at?: string
        }
        Update: {
          conversion_probability?: number
          created_at?: string
          id?: string
          last_calculated_at?: string
          lead_id?: string
          predicted_close_date?: string | null
          predicted_sale_amount?: number | null
          prediction_factors?: Json | null
          temperature_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_conversion_predictions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_inventory_interests: {
        Row: {
          created_at: string
          id: string
          interest_type: string
          inventory_id: string
          lead_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interest_type?: string
          inventory_id: string
          lead_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interest_type?: string
          inventory_id?: string
          lead_id?: string
          notes?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead_notes_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_personalities: {
        Row: {
          communication_style: string
          decision_speed: string
          id: string
          interest_level: string
          last_updated: string
          lead_id: string
          personality_score: number
          preferred_contact_method: string
          price_sensitivity: string
          response_preference: string
        }
        Insert: {
          communication_style?: string
          decision_speed?: string
          id?: string
          interest_level?: string
          last_updated?: string
          lead_id: string
          personality_score?: number
          preferred_contact_method?: string
          price_sensitivity?: string
          response_preference?: string
        }
        Update: {
          communication_style?: string
          decision_speed?: string
          id?: string
          interest_level?: string
          last_updated?: string
          lead_id?: string
          personality_score?: number
          preferred_contact_method?: string
          price_sensitivity?: string
          response_preference?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_personalities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_process_assignments: {
        Row: {
          assigned_at: string
          current_stage: number
          id: string
          lead_id: string
          next_message_at: string | null
          performance_notes: string | null
          process_id: string
          status: Database["public"]["Enums"]["process_assignment_status"]
        }
        Insert: {
          assigned_at?: string
          current_stage?: number
          id?: string
          lead_id: string
          next_message_at?: string | null
          performance_notes?: string | null
          process_id: string
          status?: Database["public"]["Enums"]["process_assignment_status"]
        }
        Update: {
          assigned_at?: string
          current_stage?: number
          id?: string
          lead_id?: string
          next_message_at?: string | null
          performance_notes?: string | null
          process_id?: string
          status?: Database["public"]["Enums"]["process_assignment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_process_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_process_assignments_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "lead_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_processes: {
        Row: {
          aggression_level: Database["public"]["Enums"]["aggression_level"]
          created_at: string
          description: string | null
          escalation_rules: Json | null
          id: string
          is_active: boolean
          message_sequence: Json | null
          name: string
          performance_metrics: Json | null
          success_criteria: Json | null
          updated_at: string
        }
        Insert: {
          aggression_level: Database["public"]["Enums"]["aggression_level"]
          created_at?: string
          description?: string | null
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean
          message_sequence?: Json | null
          name: string
          performance_metrics?: Json | null
          success_criteria?: Json | null
          updated_at?: string
        }
        Update: {
          aggression_level?: Database["public"]["Enums"]["aggression_level"]
          created_at?: string
          description?: string | null
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean
          message_sequence?: Json | null
          name?: string
          performance_metrics?: Json | null
          success_criteria?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_response_patterns: {
        Row: {
          avg_response_time_hours: number | null
          best_response_days: number[] | null
          best_response_hours: number[] | null
          created_at: string
          id: string
          inventory_responsiveness: Json | null
          last_response_at: string | null
          lead_id: string
          preferred_content_types: string[] | null
          total_messages_sent: number | null
          total_responses: number | null
          updated_at: string
        }
        Insert: {
          avg_response_time_hours?: number | null
          best_response_days?: number[] | null
          best_response_hours?: number[] | null
          created_at?: string
          id?: string
          inventory_responsiveness?: Json | null
          last_response_at?: string | null
          lead_id: string
          preferred_content_types?: string[] | null
          total_messages_sent?: number | null
          total_responses?: number | null
          updated_at?: string
        }
        Update: {
          avg_response_time_hours?: number | null
          best_response_days?: number[] | null
          best_response_hours?: number[] | null
          created_at?: string
          id?: string
          inventory_responsiveness?: Json | null
          last_response_at?: string | null
          lead_id?: string
          preferred_content_types?: string[] | null
          total_messages_sent?: number | null
          total_responses?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_vehicle_mentions: {
        Row: {
          ai_response_notes: string | null
          context_type: string
          conversation_id: string | null
          created_at: string
          id: string
          inventory_available: boolean | null
          lead_id: string
          mentioned_at: string
          mentioned_vehicle: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
        }
        Insert: {
          ai_response_notes?: string | null
          context_type?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          inventory_available?: boolean | null
          lead_id: string
          mentioned_at?: string
          mentioned_vehicle: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Update: {
          ai_response_notes?: string | null
          context_type?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          inventory_available?: boolean | null
          lead_id?: string
          mentioned_at?: string
          mentioned_vehicle?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_vehicle_mentions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_vehicle_mentions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          ai_aggression_level: number | null
          ai_contact_enabled: boolean | null
          ai_enabled_at: string | null
          ai_last_message_stage: string | null
          ai_messages_sent: number | null
          ai_opt_in: boolean
          ai_pause_reason: string | null
          ai_replies_enabled: boolean | null
          ai_resume_at: string | null
          ai_sequence_paused: boolean | null
          ai_stage: string | null
          ai_strategy_bucket: string | null
          ai_strategy_last_updated: string | null
          ai_takeover_delay_minutes: number | null
          ai_takeover_enabled: boolean | null
          city: string | null
          conversion_probability: number | null
          created_at: string
          data_source_quality_score: number | null
          do_not_call: boolean
          do_not_email: boolean
          do_not_mail: boolean
          email: string | null
          email_alt: string | null
          email_opt_in: boolean | null
          email_sequence_paused: boolean | null
          email_sequence_stage: string | null
          financing_needed: boolean | null
          first_name: string
          has_trade_vehicle: boolean | null
          human_response_deadline: string | null
          id: string
          last_name: string
          last_prediction_update: string | null
          last_reply_at: string | null
          lead_source_name: string | null
          lead_status_type_name: string | null
          lead_type_name: string | null
          message_intensity: string | null
          middle_name: string | null
          next_ai_send_at: string | null
          next_email_send_at: string | null
          original_row_index: number | null
          original_status: string | null
          pending_human_response: boolean | null
          phone: string | null
          postal_code: string | null
          predicted_close_date: string | null
          preferred_mileage_max: number | null
          preferred_price_max: number | null
          preferred_price_min: number | null
          preferred_year_max: number | null
          preferred_year_min: number | null
          raw_upload_data: Json | null
          salesperson_first_name: string | null
          salesperson_id: string | null
          salesperson_last_name: string | null
          source: string
          state: string | null
          status: string
          status_mapping_log: Json | null
          temperature_score: number | null
          trade_decision_timeline: string | null
          trade_financing_bank: string | null
          trade_in_vehicle: string | null
          trade_motivation: string | null
          trade_payoff_amount: number | null
          updated_at: string
          upload_history_id: string | null
          vehicle_interest: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_vin: string | null
          vehicle_year: string | null
        }
        Insert: {
          address?: string | null
          ai_aggression_level?: number | null
          ai_contact_enabled?: boolean | null
          ai_enabled_at?: string | null
          ai_last_message_stage?: string | null
          ai_messages_sent?: number | null
          ai_opt_in?: boolean
          ai_pause_reason?: string | null
          ai_replies_enabled?: boolean | null
          ai_resume_at?: string | null
          ai_sequence_paused?: boolean | null
          ai_stage?: string | null
          ai_strategy_bucket?: string | null
          ai_strategy_last_updated?: string | null
          ai_takeover_delay_minutes?: number | null
          ai_takeover_enabled?: boolean | null
          city?: string | null
          conversion_probability?: number | null
          created_at?: string
          data_source_quality_score?: number | null
          do_not_call?: boolean
          do_not_email?: boolean
          do_not_mail?: boolean
          email?: string | null
          email_alt?: string | null
          email_opt_in?: boolean | null
          email_sequence_paused?: boolean | null
          email_sequence_stage?: string | null
          financing_needed?: boolean | null
          first_name: string
          has_trade_vehicle?: boolean | null
          human_response_deadline?: string | null
          id?: string
          last_name: string
          last_prediction_update?: string | null
          last_reply_at?: string | null
          lead_source_name?: string | null
          lead_status_type_name?: string | null
          lead_type_name?: string | null
          message_intensity?: string | null
          middle_name?: string | null
          next_ai_send_at?: string | null
          next_email_send_at?: string | null
          original_row_index?: number | null
          original_status?: string | null
          pending_human_response?: boolean | null
          phone?: string | null
          postal_code?: string | null
          predicted_close_date?: string | null
          preferred_mileage_max?: number | null
          preferred_price_max?: number | null
          preferred_price_min?: number | null
          preferred_year_max?: number | null
          preferred_year_min?: number | null
          raw_upload_data?: Json | null
          salesperson_first_name?: string | null
          salesperson_id?: string | null
          salesperson_last_name?: string | null
          source?: string
          state?: string | null
          status?: string
          status_mapping_log?: Json | null
          temperature_score?: number | null
          trade_decision_timeline?: string | null
          trade_financing_bank?: string | null
          trade_in_vehicle?: string | null
          trade_motivation?: string | null
          trade_payoff_amount?: number | null
          updated_at?: string
          upload_history_id?: string | null
          vehicle_interest: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
          vehicle_year?: string | null
        }
        Update: {
          address?: string | null
          ai_aggression_level?: number | null
          ai_contact_enabled?: boolean | null
          ai_enabled_at?: string | null
          ai_last_message_stage?: string | null
          ai_messages_sent?: number | null
          ai_opt_in?: boolean
          ai_pause_reason?: string | null
          ai_replies_enabled?: boolean | null
          ai_resume_at?: string | null
          ai_sequence_paused?: boolean | null
          ai_stage?: string | null
          ai_strategy_bucket?: string | null
          ai_strategy_last_updated?: string | null
          ai_takeover_delay_minutes?: number | null
          ai_takeover_enabled?: boolean | null
          city?: string | null
          conversion_probability?: number | null
          created_at?: string
          data_source_quality_score?: number | null
          do_not_call?: boolean
          do_not_email?: boolean
          do_not_mail?: boolean
          email?: string | null
          email_alt?: string | null
          email_opt_in?: boolean | null
          email_sequence_paused?: boolean | null
          email_sequence_stage?: string | null
          financing_needed?: boolean | null
          first_name?: string
          has_trade_vehicle?: boolean | null
          human_response_deadline?: string | null
          id?: string
          last_name?: string
          last_prediction_update?: string | null
          last_reply_at?: string | null
          lead_source_name?: string | null
          lead_status_type_name?: string | null
          lead_type_name?: string | null
          message_intensity?: string | null
          middle_name?: string | null
          next_ai_send_at?: string | null
          next_email_send_at?: string | null
          original_row_index?: number | null
          original_status?: string | null
          pending_human_response?: boolean | null
          phone?: string | null
          postal_code?: string | null
          predicted_close_date?: string | null
          preferred_mileage_max?: number | null
          preferred_price_max?: number | null
          preferred_price_min?: number | null
          preferred_year_max?: number | null
          preferred_year_min?: number | null
          raw_upload_data?: Json | null
          salesperson_first_name?: string | null
          salesperson_id?: string | null
          salesperson_last_name?: string | null
          source?: string
          state?: string | null
          status?: string
          status_mapping_log?: Json | null
          temperature_score?: number | null
          trade_decision_timeline?: string | null
          trade_financing_bank?: string | null
          trade_in_vehicle?: string | null
          trade_motivation?: string | null
          trade_payoff_amount?: number | null
          updated_at?: string
          upload_history_id?: string | null
          vehicle_interest?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
          vehicle_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_upload_history_id_fkey"
            columns: ["upload_history_id"]
            isOneToOne: false
            referencedRelation: "upload_history"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_disclosures: {
        Row: {
          created_at: string
          disclosure_type: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          disclosure_type?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          disclosure_type?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      market_intelligence: {
        Row: {
          analysis_date: string
          competitive_pressure: string
          created_at: string
          data_sources: Json | null
          demand_trend: string
          economic_indicators: Json | null
          id: string
          inventory_levels: string
          market_segment: string
          price_trend: string
          recommendations: Json | null
          seasonal_factor: number | null
        }
        Insert: {
          analysis_date: string
          competitive_pressure?: string
          created_at?: string
          data_sources?: Json | null
          demand_trend?: string
          economic_indicators?: Json | null
          id?: string
          inventory_levels?: string
          market_segment: string
          price_trend?: string
          recommendations?: Json | null
          seasonal_factor?: number | null
        }
        Update: {
          analysis_date?: string
          competitive_pressure?: string
          created_at?: string
          data_sources?: Json | null
          demand_trend?: string
          economic_indicators?: Json | null
          id?: string
          inventory_levels?: string
          market_segment?: string
          price_trend?: string
          recommendations?: Json | null
          seasonal_factor?: number | null
        }
        Relationships: []
      }
      message_exports: {
        Row: {
          created_at: string
          created_by: string | null
          export_data: Json
          export_name: string
          id: string
          processed: boolean
          processed_at: string | null
          source_system: string
          total_leads: number
          total_messages: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          export_data?: Json
          export_name: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          source_system?: string
          total_leads?: number
          total_messages?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          export_data?: Json
          export_name?: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          source_system?: string
          total_leads?: number
          total_messages?: number
        }
        Relationships: []
      }
      message_import_mapping: {
        Row: {
          created_at: string
          export_id: string | null
          external_lead_id: string
          external_message_id: string | null
          id: string
          internal_lead_id: string | null
          internal_message_id: string | null
          mapping_status: string
        }
        Insert: {
          created_at?: string
          export_id?: string | null
          external_lead_id: string
          external_message_id?: string | null
          id?: string
          internal_lead_id?: string | null
          internal_message_id?: string | null
          mapping_status?: string
        }
        Update: {
          created_at?: string
          export_id?: string | null
          external_lead_id?: string
          external_message_id?: string | null
          id?: string
          internal_lead_id?: string | null
          internal_message_id?: string | null
          mapping_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_import_mapping_export_id_fkey"
            columns: ["export_id"]
            isOneToOne: false
            referencedRelation: "message_exports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_import_mapping_internal_lead_id_fkey"
            columns: ["internal_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_import_mapping_internal_message_id_fkey"
            columns: ["internal_message_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_sentiment: {
        Row: {
          confidence_score: number
          conversation_id: string
          created_at: string
          emotions: Json | null
          id: string
          sentiment_label: string
          sentiment_score: number
        }
        Insert: {
          confidence_score?: number
          conversation_id: string
          created_at?: string
          emotions?: Json | null
          id?: string
          sentiment_label?: string
          sentiment_score?: number
        }
        Update: {
          confidence_score?: number
          conversation_id?: string
          created_at?: string
          emotions?: Json | null
          id?: string
          sentiment_label?: string
          sentiment_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_sentiment_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_shared: boolean
          title: string
          updated_at: string
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          title: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          title?: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          content: string
          conversation_id: string | null
          id: string
          lead_id: string | null
          notification_type: string
          sent_at: string
          sent_to: string
          status: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          id?: string
          lead_id?: string | null
          notification_type: string
          sent_at?: string
          sent_to: string
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          id?: string
          lead_id?: string | null
          notification_type?: string
          sent_at?: string
          sent_to?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          last_attempt: string | null
          lead_id: string
          number: string
          priority: number
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          last_attempt?: string | null
          lead_id: string
          number: string
          priority?: number
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          last_attempt?: string | null
          lead_id?: string
          number?: string
          priority?: number
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_forecasts: {
        Row: {
          confidence_level: string
          created_at: string
          forecast_month: string
          id: string
          predicted_closes: number
          predicted_revenue: number
          salesperson_id: string | null
          updated_at: string
          weighted_pipeline: number
        }
        Insert: {
          confidence_level?: string
          created_at?: string
          forecast_month: string
          id?: string
          predicted_closes?: number
          predicted_revenue?: number
          salesperson_id?: string | null
          updated_at?: string
          weighted_pipeline?: number
        }
        Update: {
          confidence_level?: string
          created_at?: string
          forecast_month?: string
          id?: string
          predicted_closes?: number
          predicted_revenue?: number
          salesperson_id?: string | null
          updated_at?: string
          weighted_pipeline?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_forecasts_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_model_performance: {
        Row: {
          accuracy_score: number
          created_at: string
          evaluation_date: string
          id: string
          model_type: string
          model_version: string
          performance_notes: string | null
          precision_score: number | null
          recall_score: number | null
          sample_size: number
        }
        Insert: {
          accuracy_score?: number
          created_at?: string
          evaluation_date?: string
          id?: string
          model_type: string
          model_version?: string
          performance_notes?: string | null
          precision_score?: number | null
          recall_score?: number | null
          sample_size?: number
        }
        Update: {
          accuracy_score?: number
          created_at?: string
          evaluation_date?: string
          id?: string
          model_type?: string
          model_version?: string
          performance_notes?: string | null
          precision_score?: number | null
          recall_score?: number | null
          sample_size?: number
        }
        Relationships: []
      }
      pricing_disclaimers: {
        Row: {
          created_at: string
          disclaimer_text: string
          disclaimer_type: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disclaimer_text: string
          disclaimer_type?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disclaimer_text?: string
          disclaimer_type?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          notification_preferences_id: string | null
          personal_phone: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          notification_preferences_id?: string | null
          personal_phone?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notification_preferences_id?: string | null
          personal_phone?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_notification_preferences_id_fkey"
            columns: ["notification_preferences_id"]
            isOneToOne: false
            referencedRelation: "user_notification_preferences"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_snapshots: {
        Row: {
          created_at: string
          dealer_trade_gross: number | null
          dealer_trade_units: number | null
          id: string
          new_gross: number
          new_units: number
          pack_adjustment_used: number | null
          retail_gross: number | null
          retail_units: number | null
          snapshot_date: string
          total_fi_profit: number
          total_gross: number
          total_profit: number
          total_sales: number
          total_units: number
          updated_at: string
          upload_history_id: string | null
          used_gross: number
          used_units: number
          wholesale_gross: number | null
          wholesale_units: number | null
        }
        Insert: {
          created_at?: string
          dealer_trade_gross?: number | null
          dealer_trade_units?: number | null
          id?: string
          new_gross?: number
          new_units?: number
          pack_adjustment_used?: number | null
          retail_gross?: number | null
          retail_units?: number | null
          snapshot_date: string
          total_fi_profit?: number
          total_gross?: number
          total_profit?: number
          total_sales?: number
          total_units?: number
          updated_at?: string
          upload_history_id?: string | null
          used_gross?: number
          used_units?: number
          wholesale_gross?: number | null
          wholesale_units?: number | null
        }
        Update: {
          created_at?: string
          dealer_trade_gross?: number | null
          dealer_trade_units?: number | null
          id?: string
          new_gross?: number
          new_units?: number
          pack_adjustment_used?: number | null
          retail_gross?: number | null
          retail_units?: number | null
          snapshot_date?: string
          total_fi_profit?: number
          total_gross?: number
          total_profit?: number
          total_sales?: number
          total_units?: number
          updated_at?: string
          upload_history_id?: string | null
          used_gross?: number
          used_units?: number
          wholesale_gross?: number | null
          wholesale_units?: number | null
        }
        Relationships: []
      }
      recon_approvals: {
        Row: {
          approval_status: string
          created_at: string
          id: string
          notes: string | null
          service_line_id: string
          user_id: string
        }
        Insert: {
          approval_status: string
          created_at?: string
          id?: string
          notes?: string | null
          service_line_id: string
          user_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          id?: string
          notes?: string | null
          service_line_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recon_approvals_service_line_id_fkey"
            columns: ["service_line_id"]
            isOneToOne: false
            referencedRelation: "recon_service_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_attachments: {
        Row: {
          created_at: string
          id: string
          service_line_id: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_line_id: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          service_line_id?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recon_attachments_service_line_id_fkey"
            columns: ["service_line_id"]
            isOneToOne: false
            referencedRelation: "recon_service_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_logs: {
        Row: {
          action_detail: string | null
          action_type: string
          created_at: string
          id: string
          inventory_id: string
          performed_by: string | null
        }
        Insert: {
          action_detail?: string | null
          action_type: string
          created_at?: string
          id?: string
          inventory_id: string
          performed_by?: string | null
        }
        Update: {
          action_detail?: string | null
          action_type?: string
          created_at?: string
          id?: string
          inventory_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_logs_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_service_lines: {
        Row: {
          assigned_to: string | null
          cost: number | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          inventory_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          inventory_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          inventory_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recon_service_lines_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_service_lines_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      response_suggestions: {
        Row: {
          confidence_score: number
          context_type: string
          created_at: string
          id: string
          lead_id: string
          success_count: number
          suggestion_text: string
          usage_count: number
        }
        Insert: {
          confidence_score?: number
          context_type?: string
          created_at?: string
          id?: string
          lead_id: string
          success_count?: number
          suggestion_text: string
          usage_count?: number
        }
        Update: {
          confidence_score?: number
          context_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          success_count?: number
          suggestion_text?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "response_suggestions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rpo_code_intelligence: {
        Row: {
          category: string | null
          confidence_score: number | null
          created_at: string
          description: string | null
          feature_type: string | null
          id: string
          learned_from_source: string[] | null
          mapped_value: string | null
          model_years: number[] | null
          rpo_code: string
          updated_at: string
          vehicle_makes: string[] | null
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          feature_type?: string | null
          id?: string
          learned_from_source?: string[] | null
          mapped_value?: string | null
          model_years?: number[] | null
          rpo_code: string
          updated_at?: string
          vehicle_makes?: string[] | null
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          feature_type?: string | null
          id?: string
          learned_from_source?: string[] | null
          mapped_value?: string | null
          model_years?: number[] | null
          rpo_code?: string
          updated_at?: string
          vehicle_makes?: string[] | null
        }
        Relationships: []
      }
      rpo_learning_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          processed_mappings: Json | null
          session_name: string | null
          source_data: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          processed_mappings?: Json | null
          session_name?: string | null
          source_data?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          processed_mappings?: Json | null
          session_name?: string | null
          source_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rpo_learning_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_forecasts: {
        Row: {
          confidence_score: number
          created_at: string
          forecast_date: string
          forecast_factors: Json | null
          forecast_period: string
          id: string
          predicted_revenue: number
          predicted_units: number
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          forecast_date: string
          forecast_factors?: Json | null
          forecast_period?: string
          id?: string
          predicted_revenue?: number
          predicted_units?: number
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          forecast_date?: string
          forecast_factors?: Json | null
          forecast_period?: string
          id?: string
          predicted_revenue?: number
          predicted_units?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      successful_conversation_patterns: {
        Row: {
          conversation_flow: Json
          created_at: string
          id: string
          inventory_types: Json | null
          last_updated: string
          lead_characteristics: Json | null
          pattern_description: string | null
          pattern_name: string
          success_rate: number
          successful_outcomes: number
          timing_patterns: Json | null
          total_attempts: number
        }
        Insert: {
          conversation_flow: Json
          created_at?: string
          id?: string
          inventory_types?: Json | null
          last_updated?: string
          lead_characteristics?: Json | null
          pattern_description?: string | null
          pattern_name: string
          success_rate?: number
          successful_outcomes?: number
          timing_patterns?: Json | null
          total_attempts?: number
        }
        Update: {
          conversation_flow?: Json
          created_at?: string
          id?: string
          inventory_types?: Json | null
          last_updated?: string
          lead_characteristics?: Json | null
          pattern_description?: string | null
          pattern_name?: string
          success_rate?: number
          successful_outcomes?: number
          timing_patterns?: Json | null
          total_attempts?: number
        }
        Relationships: []
      }
      trade_appraisal_appointments: {
        Row: {
          appointment_id: string | null
          appraisal_result: Json | null
          appraisal_status: string
          appraisal_type: string
          appraiser_id: string | null
          completed_at: string | null
          created_at: string
          estimated_duration: number | null
          id: string
          special_instructions: string | null
          trade_vehicle_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          appraisal_result?: Json | null
          appraisal_status?: string
          appraisal_type?: string
          appraiser_id?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_duration?: number | null
          id?: string
          special_instructions?: string | null
          trade_vehicle_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          appraisal_result?: Json | null
          appraisal_status?: string
          appraisal_type?: string
          appraiser_id?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_duration?: number | null
          id?: string
          special_instructions?: string | null
          trade_vehicle_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_appraisal_appointments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_appraisal_appointments_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_appraisal_appointments_trade_vehicle_id_fkey"
            columns: ["trade_vehicle_id"]
            isOneToOne: false
            referencedRelation: "trade_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_valuations: {
        Row: {
          appraised_by: string | null
          created_at: string
          depreciation_factors: Json | null
          estimated_value: number | null
          expires_at: string | null
          id: string
          is_final_offer: boolean | null
          market_conditions: string | null
          private_party_value: number | null
          retail_value: number | null
          trade_in_value: number | null
          trade_vehicle_id: string
          valuation_date: string
          valuation_notes: string | null
          valuation_source: string
          wholesale_value: number | null
        }
        Insert: {
          appraised_by?: string | null
          created_at?: string
          depreciation_factors?: Json | null
          estimated_value?: number | null
          expires_at?: string | null
          id?: string
          is_final_offer?: boolean | null
          market_conditions?: string | null
          private_party_value?: number | null
          retail_value?: number | null
          trade_in_value?: number | null
          trade_vehicle_id: string
          valuation_date?: string
          valuation_notes?: string | null
          valuation_source: string
          wholesale_value?: number | null
        }
        Update: {
          appraised_by?: string | null
          created_at?: string
          depreciation_factors?: Json | null
          estimated_value?: number | null
          expires_at?: string | null
          id?: string
          is_final_offer?: boolean | null
          market_conditions?: string | null
          private_party_value?: number | null
          retail_value?: number | null
          trade_in_value?: number | null
          trade_vehicle_id?: string
          valuation_date?: string
          valuation_notes?: string | null
          valuation_source?: string
          wholesale_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_valuations_appraised_by_fkey"
            columns: ["appraised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_valuations_trade_vehicle_id_fkey"
            columns: ["trade_vehicle_id"]
            isOneToOne: false
            referencedRelation: "trade_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_vehicles: {
        Row: {
          accident_history: boolean | null
          additional_notes: string | null
          condition: string | null
          created_at: string
          drivetrain: string | null
          exterior_color: string | null
          fuel_type: string | null
          id: string
          interior_color: string | null
          lead_id: string
          liens_outstanding: boolean | null
          make: string | null
          mileage: number | null
          model: string | null
          modifications: string | null
          photos: Json | null
          service_records: boolean | null
          title_type: string | null
          transmission: string | null
          trim: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          accident_history?: boolean | null
          additional_notes?: string | null
          condition?: string | null
          created_at?: string
          drivetrain?: string | null
          exterior_color?: string | null
          fuel_type?: string | null
          id?: string
          interior_color?: string | null
          lead_id: string
          liens_outstanding?: boolean | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          modifications?: string | null
          photos?: Json | null
          service_records?: boolean | null
          title_type?: string | null
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          accident_history?: boolean | null
          additional_notes?: string | null
          condition?: string | null
          created_at?: string
          drivetrain?: string | null
          exterior_color?: string | null
          fuel_type?: string | null
          id?: string
          interior_color?: string | null
          lead_id?: string
          liens_outstanding?: boolean | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          modifications?: string | null
          photos?: Json | null
          service_records?: boolean | null
          title_type?: string | null
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_vehicles_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      training_recommendations: {
        Row: {
          completion_status: string
          conversation_examples: Json | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          priority: string
          recommendation_type: string
          salesperson_id: string
          skills_focus: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          completion_status?: string
          conversation_examples?: Json | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          priority?: string
          recommendation_type: string
          salesperson_id: string
          skills_focus?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          completion_status?: string
          conversation_examples?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          recommendation_type?: string
          salesperson_id?: string
          skills_focus?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_recommendations_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_history: {
        Row: {
          created_at: string
          duplicate_count: number
          error_details: string | null
          failed_imports: number
          field_mapping: Json | null
          file_size: number
          file_type: string
          id: string
          inventory_condition: string | null
          original_filename: string
          processed_at: string | null
          processing_errors: Json | null
          processing_status: string
          source_type: string | null
          stored_filename: string
          successful_imports: number
          total_rows: number
          upload_completed_at: string | null
          upload_started_at: string | null
          upload_status: string | null
          upload_type: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duplicate_count?: number
          error_details?: string | null
          failed_imports?: number
          field_mapping?: Json | null
          file_size: number
          file_type: string
          id?: string
          inventory_condition?: string | null
          original_filename: string
          processed_at?: string | null
          processing_errors?: Json | null
          processing_status?: string
          source_type?: string | null
          stored_filename: string
          successful_imports?: number
          total_rows?: number
          upload_completed_at?: string | null
          upload_started_at?: string | null
          upload_status?: string | null
          upload_type: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duplicate_count?: number
          error_details?: string | null
          failed_imports?: number
          field_mapping?: Json | null
          file_size?: number
          file_type?: string
          id?: string
          inventory_condition?: string | null
          original_filename?: string
          processed_at?: string | null
          processing_errors?: Json | null
          processing_status?: string
          source_type?: string | null
          stored_filename?: string
          successful_imports?: number
          total_rows?: number
          upload_completed_at?: string | null
          upload_started_at?: string | null
          upload_status?: string | null
          upload_type?: string
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          browser_notifications_enabled: boolean
          created_at: string
          digest_enabled: boolean
          digest_frequency: string
          id: string
          notification_hours_end: number
          notification_hours_start: number
          personal_phone: string | null
          sms_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_notifications_enabled?: boolean
          created_at?: string
          digest_enabled?: boolean
          digest_frequency?: string
          id?: string
          notification_hours_end?: number
          notification_hours_start?: number
          personal_phone?: string | null
          sms_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_notifications_enabled?: boolean
          created_at?: string
          digest_enabled?: boolean
          digest_frequency?: string
          id?: string
          notification_hours_end?: number
          notification_hours_start?: number
          personal_phone?: string | null
          sms_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_duplicates: {
        Row: {
          confidence_score: number
          created_at: string
          duplicate_inventory_id: string | null
          id: string
          master_vehicle_id: string | null
          match_type: string
          resolution_action: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          duplicate_inventory_id?: string | null
          id?: string
          master_vehicle_id?: string | null
          match_type: string
          resolution_action?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          confidence_score?: number
          created_at?: string
          duplicate_inventory_id?: string | null
          id?: string
          master_vehicle_id?: string | null
          match_type?: string
          resolution_action?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_duplicates_master_vehicle_id_fkey"
            columns: ["master_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_master"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_history: {
        Row: {
          created_at: string
          gm_order_number: string | null
          history_type: string
          id: string
          make: string
          model: string
          source_data: Json
          source_report: string
          status: string
          stock_number: string | null
          updated_at: string
          upload_history_id: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          gm_order_number?: string | null
          history_type: string
          id?: string
          make: string
          model: string
          source_data?: Json
          source_report: string
          status?: string
          stock_number?: string | null
          updated_at?: string
          upload_history_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          gm_order_number?: string | null
          history_type?: string
          id?: string
          make?: string
          model?: string
          source_data?: Json
          source_report?: string
          status?: string
          stock_number?: string | null
          updated_at?: string
          upload_history_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
      vehicle_master: {
        Row: {
          created_at: string
          current_status: string
          data_quality_score: number | null
          first_seen_at: string
          gm_order_number: string | null
          id: string
          inventory_data: Json | null
          last_updated_at: string
          make: string
          model: string
          order_data: Json | null
          sale_data: Json | null
          stock_number: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          current_status?: string
          data_quality_score?: number | null
          first_seen_at?: string
          gm_order_number?: string | null
          id?: string
          inventory_data?: Json | null
          last_updated_at?: string
          make: string
          model: string
          order_data?: Json | null
          sale_data?: Json | null
          stock_number?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          current_status?: string
          data_quality_score?: number | null
          first_seen_at?: string
          gm_order_number?: string | null
          id?: string
          inventory_data?: Json | null
          last_updated_at?: string
          make?: string
          model?: string
          order_data?: Json | null
          sale_data?: Json | null
          stock_number?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
      vehicle_velocity_tracking: {
        Row: {
          avg_days_to_sell: number
          body_style: string | null
          created_at: string
          current_inventory_count: number
          id: string
          last_sale_date: string | null
          make: string
          model: string
          total_sold: number
          updated_at: string
          velocity_trend: string
          year: number | null
        }
        Insert: {
          avg_days_to_sell?: number
          body_style?: string | null
          created_at?: string
          current_inventory_count?: number
          id?: string
          last_sale_date?: string | null
          make: string
          model: string
          total_sold?: number
          updated_at?: string
          velocity_trend?: string
          year?: number | null
        }
        Update: {
          avg_days_to_sell?: number
          body_style?: string | null
          created_at?: string
          current_inventory_count?: number
          id?: string
          last_sale_date?: string | null
          make?: string
          model?: string
          total_sold?: number
          updated_at?: string
          velocity_trend?: string
          year?: number | null
        }
        Relationships: []
      }
      website_activities: {
        Row: {
          actions_taken: string[] | null
          id: string
          lead_id: string
          page_type: string
          page_url: string
          time_spent: number
          timestamp: string
        }
        Insert: {
          actions_taken?: string[] | null
          id?: string
          lead_id: string
          page_type: string
          page_url: string
          time_spent?: number
          timestamp?: string
        }
        Update: {
          actions_taken?: string[] | null
          id?: string
          lead_id?: string
          page_type?: string
          page_url?: string
          time_spent?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_monthly_retail_summary: {
        Row: {
          dealer_trade_gross_mtd: number | null
          dealer_trade_units_mtd: number | null
          new_gross_mtd: number | null
          new_units_mtd: number | null
          retail_gross_mtd: number | null
          retail_units_mtd: number | null
          total_profit_mtd: number | null
          total_units_mtd: number | null
          used_gross_mtd: number | null
          used_units_mtd: number | null
          wholesale_gross_mtd: number | null
          wholesale_units_mtd: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      book_appointment_slot: {
        Args: { p_date: string; p_time: string }
        Returns: boolean
      }
      calculate_ai_strategy_for_lead: {
        Args: {
          p_lead_id: string
          p_lead_status_type_name?: string
          p_lead_type_name?: string
          p_lead_source_name?: string
        }
        Returns: undefined
      }
      calculate_delivery_variance: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_lead_temperature: {
        Args: { p_lead_id: string }
        Returns: number
      }
      calculate_leads_count: {
        Args: { p_vin: string; p_stock_number: string }
        Returns: number
      }
      classify_deal_by_stock: {
        Args: { stock_number: string }
        Returns: string
      }
      clean_vehicle_interest_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      detect_vehicle_duplicates: {
        Args: { p_upload_history_id: string }
        Returns: number
      }
      find_matching_inventory: {
        Args: { p_lead_id: string }
        Returns: {
          inventory_id: string
          match_score: number
          vin: string
          year: number
          make: string
          model: string
          price: number
        }[]
      }
      generate_booking_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_appointment_slots: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          slot_date: string
          slot_time: string
          available_spots: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_gm_global_status_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          status_code: string
          status_count: number
          status_description: string
        }[]
      }
      get_gm_orders_by_delivery_timeline: {
        Args: { p_start_date?: string; p_end_date?: string }
        Returns: {
          id: string
          gm_order_number: string
          customer_name: string
          estimated_delivery_date: string
          actual_delivery_date: string
          make: string
          model: string
          year: number
          status: string
          gm_status_description: string
          delivery_variance_days: number
          is_overdue: boolean
        }[]
      }
      get_rpo_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          rpo_code: string
          total_vehicles: number
          sold_vehicles: number
          avg_days_to_sell: number
          total_sales_value: number
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      increment_template_usage: {
        Args: { template_id: string }
        Returns: undefined
      }
      mark_missing_vehicles_sold: {
        Args: { p_upload_id: string }
        Returns: undefined
      }
      normalize_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      schedule_next_touch: {
        Args: { lead_uuid: string }
        Returns: undefined
      }
      set_primary_phone: {
        Args: { p_lead_id: string; p_phone_id: string }
        Returns: undefined
      }
      update_daily_kpis: {
        Args: { target_date?: string }
        Returns: undefined
      }
      update_daily_learning_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_inventory_days: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_inventory_leads_count: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_inventory_velocity_tracking: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      upsert_expanded_profit_snapshot: {
        Args: {
          p_date: string
          p_retail_units: number
          p_retail_gross: number
          p_dealer_trade_units: number
          p_dealer_trade_gross: number
          p_wholesale_units: number
          p_wholesale_gross: number
          p_new_units: number
          p_new_gross: number
          p_used_units: number
          p_used_gross: number
          p_total_units: number
          p_total_sales: number
          p_total_gross: number
          p_total_fi_profit: number
          p_total_profit: number
          p_upload_history_id: string
          p_pack_adjustment_used?: number
        }
        Returns: string
      }
      upsert_profit_snapshot: {
        Args: {
          p_date: string
          p_total_units: number
          p_total_sales: number
          p_total_gross: number
          p_total_fi_profit: number
          p_total_profit: number
          p_new_units: number
          p_new_gross: number
          p_used_units: number
          p_used_gross: number
          p_upload_history_id: string
        }
        Returns: string
      }
      upsert_rpo_intelligence: {
        Args: {
          p_rpo_code: string
          p_category: string
          p_description: string
          p_feature_type?: string
          p_mapped_value?: string
          p_confidence_score?: number
          p_vehicle_makes?: string[]
          p_model_years?: number[]
        }
        Returns: string
      }
      upsert_vehicle_master: {
        Args: {
          p_vin: string
          p_stock_number: string
          p_gm_order_number: string
          p_make: string
          p_model: string
          p_year: number
          p_status: string
          p_source_report: string
          p_data: Json
        }
        Returns: string
      }
    }
    Enums: {
      aggression_level:
        | "gentle"
        | "moderate"
        | "aggressive"
        | "super_aggressive"
      app_role: "admin" | "manager" | "sales" | "user"
      process_assignment_status: "active" | "paused" | "completed" | "escalated"
      source_report_type:
        | "new_car_main_view"
        | "merch_inv_view"
        | "orders_all"
        | "website_scrape"
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
      aggression_level: [
        "gentle",
        "moderate",
        "aggressive",
        "super_aggressive",
      ],
      app_role: ["admin", "manager", "sales", "user"],
      process_assignment_status: ["active", "paused", "completed", "escalated"],
      source_report_type: [
        "new_car_main_view",
        "merch_inv_view",
        "orders_all",
        "website_scrape",
      ],
    },
  },
} as const
