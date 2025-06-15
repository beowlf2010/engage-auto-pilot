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
      conversation_memory: {
        Row: {
          confidence: number | null
          content: string
          created_at: string
          id: string
          lead_id: string
          memory_type: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string
          id?: string
          lead_id: string
          memory_type: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string
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
      conversations: {
        Row: {
          ai_generated: boolean
          body: string
          created_at: string
          direction: string
          id: string
          lead_id: string
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
        ]
      }
      deals: {
        Row: {
          age: number | null
          buyer_name: string | null
          cost_amount: number | null
          created_at: string
          deal_type: string | null
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
      inventory: {
        Row: {
          accidents_reported: number | null
          acquisition_date: string | null
          age_group: string | null
          body_style: string | null
          book_value: number | null
          carfax_url: string | null
          cash_down_payment: number | null
          certification_type: string | null
          color_exterior: string | null
          color_interior: string | null
          condition: string
          created_at: string
          days_in_inventory: number | null
          dealer_notes: string | null
          dealer_pack: number | null
          description: string | null
          drivetrain: string | null
          engine: string | null
          expected_sale_date: string | null
          factory_warranty_remaining: boolean | null
          features: string[] | null
          finance_payment: number | null
          first_seen_at: string | null
          fuel_type: string | null
          full_option_blob: Json | null
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
          pack: number | null
          photos_urls: string[] | null
          previous_owners: number | null
          price: number | null
          profit_margin: number | null
          rebates: number | null
          reconditioning_cost: number | null
          rpo_codes: string[] | null
          rpo_descriptions: string[] | null
          sales_rep: string | null
          service_records_available: boolean | null
          sold_at: string | null
          source_acquired: string | null
          source_report:
            | Database["public"]["Enums"]["source_report_type"]
            | null
          status: string
          stock_number: string | null
          title_status: string | null
          trade_value: number | null
          transmission: string | null
          trim: string | null
          turn_goal_days: number | null
          updated_at: string
          upload_history_id: string | null
          vehicle_history_report: string | null
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
          age_group?: string | null
          body_style?: string | null
          book_value?: number | null
          carfax_url?: string | null
          cash_down_payment?: number | null
          certification_type?: string | null
          color_exterior?: string | null
          color_interior?: string | null
          condition?: string
          created_at?: string
          days_in_inventory?: number | null
          dealer_notes?: string | null
          dealer_pack?: number | null
          description?: string | null
          drivetrain?: string | null
          engine?: string | null
          expected_sale_date?: string | null
          factory_warranty_remaining?: boolean | null
          features?: string[] | null
          finance_payment?: number | null
          first_seen_at?: string | null
          fuel_type?: string | null
          full_option_blob?: Json | null
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
          pack?: number | null
          photos_urls?: string[] | null
          previous_owners?: number | null
          price?: number | null
          profit_margin?: number | null
          rebates?: number | null
          reconditioning_cost?: number | null
          rpo_codes?: string[] | null
          rpo_descriptions?: string[] | null
          sales_rep?: string | null
          service_records_available?: boolean | null
          sold_at?: string | null
          source_acquired?: string | null
          source_report?:
            | Database["public"]["Enums"]["source_report_type"]
            | null
          status?: string
          stock_number?: string | null
          title_status?: string | null
          trade_value?: number | null
          transmission?: string | null
          trim?: string | null
          turn_goal_days?: number | null
          updated_at?: string
          upload_history_id?: string | null
          vehicle_history_report?: string | null
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
          age_group?: string | null
          body_style?: string | null
          book_value?: number | null
          carfax_url?: string | null
          cash_down_payment?: number | null
          certification_type?: string | null
          color_exterior?: string | null
          color_interior?: string | null
          condition?: string
          created_at?: string
          days_in_inventory?: number | null
          dealer_notes?: string | null
          dealer_pack?: number | null
          description?: string | null
          drivetrain?: string | null
          engine?: string | null
          expected_sale_date?: string | null
          factory_warranty_remaining?: boolean | null
          features?: string[] | null
          finance_payment?: number | null
          first_seen_at?: string | null
          fuel_type?: string | null
          full_option_blob?: Json | null
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
          pack?: number | null
          photos_urls?: string[] | null
          previous_owners?: number | null
          price?: number | null
          profit_margin?: number | null
          rebates?: number | null
          reconditioning_cost?: number | null
          rpo_codes?: string[] | null
          rpo_descriptions?: string[] | null
          sales_rep?: string | null
          service_records_available?: boolean | null
          sold_at?: string | null
          source_acquired?: string | null
          source_report?:
            | Database["public"]["Enums"]["source_report_type"]
            | null
          status?: string
          stock_number?: string | null
          title_status?: string | null
          trade_value?: number | null
          transmission?: string | null
          trim?: string | null
          turn_goal_days?: number | null
          updated_at?: string
          upload_history_id?: string | null
          vehicle_history_report?: string | null
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
      leads: {
        Row: {
          address: string | null
          ai_last_message_stage: string | null
          ai_messages_sent: number | null
          ai_opt_in: boolean
          ai_pause_reason: string | null
          ai_resume_at: string | null
          ai_sequence_paused: boolean | null
          ai_stage: string | null
          city: string | null
          created_at: string
          do_not_call: boolean
          do_not_email: boolean
          do_not_mail: boolean
          email: string | null
          email_alt: string | null
          financing_needed: boolean | null
          first_name: string
          id: string
          last_name: string
          last_reply_at: string | null
          middle_name: string | null
          next_ai_send_at: string | null
          postal_code: string | null
          preferred_mileage_max: number | null
          preferred_price_max: number | null
          preferred_price_min: number | null
          preferred_year_max: number | null
          preferred_year_min: number | null
          salesperson_id: string | null
          source: string
          state: string | null
          status: string
          trade_in_vehicle: string | null
          updated_at: string
          vehicle_interest: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_vin: string | null
          vehicle_year: string | null
        }
        Insert: {
          address?: string | null
          ai_last_message_stage?: string | null
          ai_messages_sent?: number | null
          ai_opt_in?: boolean
          ai_pause_reason?: string | null
          ai_resume_at?: string | null
          ai_sequence_paused?: boolean | null
          ai_stage?: string | null
          city?: string | null
          created_at?: string
          do_not_call?: boolean
          do_not_email?: boolean
          do_not_mail?: boolean
          email?: string | null
          email_alt?: string | null
          financing_needed?: boolean | null
          first_name: string
          id?: string
          last_name: string
          last_reply_at?: string | null
          middle_name?: string | null
          next_ai_send_at?: string | null
          postal_code?: string | null
          preferred_mileage_max?: number | null
          preferred_price_max?: number | null
          preferred_price_min?: number | null
          preferred_year_max?: number | null
          preferred_year_min?: number | null
          salesperson_id?: string | null
          source?: string
          state?: string | null
          status?: string
          trade_in_vehicle?: string | null
          updated_at?: string
          vehicle_interest: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
          vehicle_year?: string | null
        }
        Update: {
          address?: string | null
          ai_last_message_stage?: string | null
          ai_messages_sent?: number | null
          ai_opt_in?: boolean
          ai_pause_reason?: string | null
          ai_resume_at?: string | null
          ai_sequence_paused?: boolean | null
          ai_stage?: string | null
          city?: string | null
          created_at?: string
          do_not_call?: boolean
          do_not_email?: boolean
          do_not_mail?: boolean
          email?: string | null
          email_alt?: string | null
          financing_needed?: boolean | null
          first_name?: string
          id?: string
          last_name?: string
          last_reply_at?: string | null
          middle_name?: string | null
          next_ai_send_at?: string | null
          postal_code?: string | null
          preferred_mileage_max?: number | null
          preferred_price_max?: number | null
          preferred_price_min?: number | null
          preferred_year_max?: number | null
          preferred_year_min?: number | null
          salesperson_id?: string | null
          source?: string
          state?: string | null
          status?: string
          trade_in_vehicle?: string | null
          updated_at?: string
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
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
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
      upload_history: {
        Row: {
          created_at: string
          duplicate_count: number
          error_details: string | null
          failed_imports: number
          file_size: number
          file_type: string
          id: string
          inventory_condition: string | null
          original_filename: string
          processed_at: string | null
          processing_status: string
          stored_filename: string
          successful_imports: number
          total_rows: number
          upload_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duplicate_count?: number
          error_details?: string | null
          failed_imports?: number
          file_size: number
          file_type: string
          id?: string
          inventory_condition?: string | null
          original_filename: string
          processed_at?: string | null
          processing_status?: string
          stored_filename: string
          successful_imports?: number
          total_rows?: number
          upload_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          duplicate_count?: number
          error_details?: string | null
          failed_imports?: number
          file_size?: number
          file_type?: string
          id?: string
          inventory_condition?: string | null
          original_filename?: string
          processed_at?: string | null
          processing_status?: string
          stored_filename?: string
          successful_imports?: number
          total_rows?: number
          upload_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_monthly_retail_summary: {
        Row: {
          month: string | null
          new_gross_mtd: number | null
          new_units_mtd: number | null
          total_profit_mtd: number | null
          total_units_mtd: number | null
          used_gross_mtd: number | null
          used_units_mtd: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_leads_count: {
        Args: { p_vin: string; p_stock_number: string }
        Returns: number
      }
      classify_deal_by_stock: {
        Args: { stock_number: string }
        Returns: string
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      update_inventory_days: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_inventory_leads_count: {
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
    }
    Enums: {
      source_report_type: "new_car_main_view" | "merch_inv_view" | "orders_all"
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
      source_report_type: ["new_car_main_view", "merch_inv_view", "orders_all"],
    },
  },
} as const
