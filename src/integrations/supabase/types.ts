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
          fuel_type: string | null
          holdback: number | null
          id: string
          images: string[] | null
          incentives: number | null
          internet_price: number | null
          invoice_cost: number | null
          key_count: number | null
          lease_payment: number | null
          lien_holder: string | null
          location: string | null
          lot_location: string | null
          make: string
          mileage: number | null
          model: string
          msrp: number | null
          photos_urls: string[] | null
          previous_owners: number | null
          price: number | null
          profit_margin: number | null
          reconditioning_cost: number | null
          sales_rep: string | null
          service_records_available: boolean | null
          sold_at: string | null
          source_acquired: string | null
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
          vin: string
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
          fuel_type?: string | null
          holdback?: number | null
          id?: string
          images?: string[] | null
          incentives?: number | null
          internet_price?: number | null
          invoice_cost?: number | null
          key_count?: number | null
          lease_payment?: number | null
          lien_holder?: string | null
          location?: string | null
          lot_location?: string | null
          make: string
          mileage?: number | null
          model: string
          msrp?: number | null
          photos_urls?: string[] | null
          previous_owners?: number | null
          price?: number | null
          profit_margin?: number | null
          reconditioning_cost?: number | null
          sales_rep?: string | null
          service_records_available?: boolean | null
          sold_at?: string | null
          source_acquired?: string | null
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
          vin: string
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
          fuel_type?: string | null
          holdback?: number | null
          id?: string
          images?: string[] | null
          incentives?: number | null
          internet_price?: number | null
          invoice_cost?: number | null
          key_count?: number | null
          lease_payment?: number | null
          lien_holder?: string | null
          location?: string | null
          lot_location?: string | null
          make?: string
          mileage?: number | null
          model?: string
          msrp?: number | null
          photos_urls?: string[] | null
          previous_owners?: number | null
          price?: number | null
          profit_margin?: number | null
          reconditioning_cost?: number | null
          sales_rep?: string | null
          service_records_available?: boolean | null
          sold_at?: string | null
          source_acquired?: string | null
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
          vin?: string
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
      leads: {
        Row: {
          address: string | null
          ai_opt_in: boolean
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
          ai_opt_in?: boolean
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
          ai_opt_in?: boolean
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
      [_ in never]: never
    }
    Functions: {
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
      normalize_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      set_primary_phone: {
        Args: { p_lead_id: string; p_phone_id: string }
        Returns: undefined
      }
      update_inventory_days: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
