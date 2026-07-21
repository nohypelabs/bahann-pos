// Auto-generated from database schema
// Run pnpm gen:types to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// PostgreSQL enum types
export type business_type = "FNB" | "RETAIL" | "SERVICE" | "HYBRID"
export type item_type = "PRODUCT" | "MENU" | "SERVICE" | "PACKAGE"
export type pricing_model = "FIXED" | "TIERED" | "TIME_BASED"
export type stock_behavior = "TRACKED" | "UNTRACKED" | "CONSUMED"

export interface Database {
  public: {
    Tables: {
      _migrations: {
        Row: {
          id: number
          filename: string
          applied_at: string
        }
        Insert: {
          id?: number
          filename: string
          applied_at?: string
        }
        Update: {
          id?: number
          filename?: string
          applied_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          user_email: string
          action: string
          entity_type: string
          entity_id: string | null
          changes: Json | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
          tenant_id: string
          outlet_id: string | null
          device_id: string | null
          shift_id: string | null
          actor_role_key: string | null
          actor_user_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          user_email: string
          action: string
          entity_type: string
          entity_id: string | null
          changes: Json | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at?: string
          tenant_id: string
          outlet_id: string | null
          device_id: string | null
          shift_id: string | null
          actor_role_key: string | null
          actor_user_id: string | null
        }
        Update: {
          id?: string
          user_id?: string
          user_email?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          changes?: Json | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          tenant_id?: string
          outlet_id?: string | null
          device_id?: string | null
          shift_id?: string | null
          actor_role_key?: string | null
          actor_user_id?: string | null
        }
      }
      bank_accounts: {
        Row: {
          id: string
          bank_name: string
          bank_code: string | null
          account_number: string
          account_name: string
          branch: string | null
          swift_code: string | null
          logo_url: string | null
          is_primary: boolean | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          bank_name: string
          bank_code: string | null
          account_number: string
          account_name: string
          branch: string | null
          swift_code: string | null
          logo_url: string | null
          is_primary?: boolean | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          bank_name?: string
          bank_code?: string | null
          account_number?: string
          account_name?: string
          branch?: string | null
          swift_code?: string | null
          logo_url?: string | null
          is_primary?: boolean | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          tenant_id?: string | null
        }
      }
      billing_history: {
        Row: {
          id: string
          user_id: string
          plan: string
          previous_plan: string | null
          amount: number
          note: string | null
          is_trial: boolean
          changed_by: string | null
          created_at: string
          tenant_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan: string
          previous_plan: string | null
          amount?: number
          note: string | null
          is_trial?: boolean
          changed_by: string | null
          created_at?: string
          tenant_id: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan?: string
          previous_plan?: string | null
          amount?: number
          note?: string | null
          is_trial?: boolean
          changed_by?: string | null
          created_at?: string
          tenant_id?: string | null
        }
      }
      business_profiles: {
        Row: {
          id: string
          user_id: string
          business_type: business_type
          enabled_modules: Json
          created_at: string
          tenant_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          business_type?: business_type
          enabled_modules?: Json
          created_at?: string
          tenant_id: string | null
        }
        Update: {
          id?: string
          user_id?: string
          business_type?: business_type
          enabled_modules?: Json
          created_at?: string
          tenant_id?: string | null
        }
      }
      cash_sessions: {
        Row: {
          id: string
          outlet_id: string | null
          opened_by: string | null
          opened_at: string
          opening_cash: number
          closed_by: string | null
          closed_at: string | null
          closing_cash: number | null
          expected_cash: number | null
          actual_cash: number | null
          difference: number | null
          total_sales: number | null
          total_transactions: number | null
          cash_sales: number | null
          card_sales: number | null
          transfer_sales: number | null
          ewallet_sales: number | null
          total_discount: number | null
          notes: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          outlet_id: string | null
          opened_by: string | null
          opened_at: string
          opening_cash: number
          closed_by: string | null
          closed_at: string | null
          closing_cash: number | null
          expected_cash: number | null
          actual_cash: number | null
          difference: number | null
          total_sales: number | null
          total_transactions: number | null
          cash_sales: number | null
          card_sales: number | null
          transfer_sales: number | null
          ewallet_sales: number | null
          total_discount: number | null
          notes: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          outlet_id?: string | null
          opened_by?: string | null
          opened_at?: string
          opening_cash?: number
          closed_by?: string | null
          closed_at?: string | null
          closing_cash?: number | null
          expected_cash?: number | null
          actual_cash?: number | null
          difference?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          cash_sales?: number | null
          card_sales?: number | null
          transfer_sales?: number | null
          ewallet_sales?: number | null
          total_discount?: number | null
          notes?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string
        }
      }
      daily_sales: {
        Row: {
          id: string
          product_id: string | null
          outlet_id: string | null
          sale_date: string
          quantity_sold: number
          revenue: number | null
          created_at: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          product_id: string | null
          outlet_id: string | null
          sale_date: string
          quantity_sold?: number
          revenue?: number | null
          created_at?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          product_id?: string | null
          outlet_id?: string | null
          sale_date?: string
          quantity_sold?: number
          revenue?: number | null
          created_at?: string | null
          tenant_id?: string
        }
      }
      daily_stock: {
        Row: {
          id: string
          product_id: string | null
          outlet_id: string | null
          stock_date: string
          stock_awal: number | null
          stock_in: number | null
          stock_out: number | null
          stock_akhir: number | null
          created_at: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          product_id: string | null
          outlet_id: string | null
          stock_date: string
          stock_awal: number | null
          stock_in?: number | null
          stock_out?: number | null
          stock_akhir: number | null
          created_at?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          product_id?: string | null
          outlet_id?: string | null
          stock_date?: string
          stock_awal?: number | null
          stock_in?: number | null
          stock_out?: number | null
          stock_akhir?: number | null
          created_at?: string | null
          tenant_id?: string
        }
      }
      operational_expenses: {
        Row: {
          id: string
          outlet_id: string
          user_id: string
          category: string
          description: string
          amount: number
          receipt_url: string | null
          expense_date: string
          is_voided: boolean | null
          voided_by: string | null
          voided_at: string | null
          void_reason: string | null
          created_at: string
          updated_at: string
          tenant_id: string
        }
        Insert: {
          id?: string
          outlet_id: string
          user_id: string
          category: string
          description: string
          amount: number
          receipt_url: string | null
          expense_date?: string
          is_voided?: boolean | null
          voided_by: string | null
          voided_at: string | null
          void_reason: string | null
          created_at?: string
          updated_at?: string
          tenant_id: string
        }
        Update: {
          id?: string
          outlet_id?: string
          user_id?: string
          category?: string
          description?: string
          amount?: number
          receipt_url?: string | null
          expense_date?: string
          is_voided?: boolean | null
          voided_by?: string | null
          voided_at?: string | null
          void_reason?: string | null
          created_at?: string
          updated_at?: string
          tenant_id?: string
        }
      }
      outlet_group_members: {
        Row: {
          outlet_group_id: string
          outlet_id: string
          created_at: string
        }
        Insert: {
          outlet_group_id: string
          outlet_id: string
          created_at?: string
        }
        Update: {
          outlet_group_id?: string
          outlet_id?: string
          created_at?: string
        }
      }
      outlet_groups: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      outlets: {
        Row: {
          id: string
          name: string
          created_at: string | null
          owner_id: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
          owner_id: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
          owner_id?: string | null
          tenant_id?: string
        }
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          used_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          used_at: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      payment_confirmations: {
        Row: {
          id: string
          payment_id: string | null
          action: string
          performed_by: string | null
          reason: string | null
          metadata: Json | null
          created_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          payment_id: string | null
          action: string
          performed_by: string | null
          reason: string | null
          metadata: Json | null
          created_at?: string | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          payment_id?: string | null
          action?: string
          performed_by?: string | null
          reason?: string | null
          metadata?: Json | null
          created_at?: string | null
          tenant_id?: string | null
        }
      }
      payment_methods: {
        Row: {
          id: string
          code: string
          name: string
          type: string
          is_active: boolean | null
          requires_confirmation: boolean | null
          icon: string | null
          instructions: string | null
          account_details: Json | null
          fee_amount: number | null
          fee_percentage: number | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          type: string
          is_active?: boolean | null
          requires_confirmation?: boolean | null
          icon: string | null
          instructions: string | null
          account_details: Json | null
          fee_amount?: number | null
          fee_percentage?: number | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          type?: string
          is_active?: boolean | null
          requires_confirmation?: boolean | null
          icon?: string | null
          instructions?: string | null
          account_details?: Json | null
          fee_amount?: number | null
          fee_percentage?: number | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
        }
      }
      payment_requests: {
        Row: {
          id: string
          user_id: string
          plan: string
          amount: number
          payment_method: string
          proof_url: string | null
          status: string
          admin_note: string | null
          reviewed_by: string | null
          created_at: string
          reviewed_at: string | null
          crypto_amount: number | null
          crypto_token: string | null
          crypto_tx_hash: string | null
          unique_amount: number | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan: string
          amount?: number
          payment_method?: string
          proof_url: string | null
          status?: string
          admin_note: string | null
          reviewed_by: string | null
          created_at?: string
          reviewed_at: string | null
          crypto_amount: number | null
          crypto_token: string | null
          crypto_tx_hash: string | null
          unique_amount: number | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan?: string
          amount?: number
          payment_method?: string
          proof_url?: string | null
          status?: string
          admin_note?: string | null
          reviewed_by?: string | null
          created_at?: string
          reviewed_at?: string | null
          crypto_amount?: number | null
          crypto_token?: string | null
          crypto_tx_hash?: string | null
          unique_amount?: number | null
          tenant_id?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          transaction_id: string | null
          payment_method_id: string | null
          amount: number
          fee: number | null
          reference_number: string | null
          payment_proof_url: string | null
          qris_content: string | null
          status: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          confirmation_notes: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_email: string | null
          wa_message_id: string | null
          wa_status: string | null
          wa_sent_at: string | null
          created_at: string | null
          updated_at: string | null
          expired_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          transaction_id: string | null
          payment_method_id: string | null
          amount: number
          fee?: number | null
          reference_number: string | null
          payment_proof_url: string | null
          qris_content: string | null
          status?: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          confirmation_notes: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_email: string | null
          wa_message_id: string | null
          wa_status: string | null
          wa_sent_at: string | null
          created_at?: string | null
          updated_at?: string | null
          expired_at: string | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          transaction_id?: string | null
          payment_method_id?: string | null
          amount?: number
          fee?: number | null
          reference_number?: string | null
          payment_proof_url?: string | null
          qris_content?: string | null
          status?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          confirmation_notes?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          wa_message_id?: string | null
          wa_status?: string | null
          wa_sent_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          expired_at?: string | null
          tenant_id?: string | null
        }
      }
      permissions: {
        Row: {
          id: string
          key: string
          description: string | null
          module: string | null
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          description: string | null
          module: string | null
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          description?: string | null
          module?: string | null
          created_at?: string
        }
      }
      platform_settings: {
        Row: {
          key: string
          value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value?: string
          updated_at?: string
          updated_by: string | null
        }
        Update: {
          key?: string
          value?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      pos_devices: {
        Row: {
          id: string
          tenant_id: string
          outlet_id: string
          name: string
          device_code: string
          status: string
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          outlet_id: string
          name: string
          device_code: string
          status?: string
          last_seen_at: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          outlet_id?: string
          name?: string
          device_code?: string
          status?: string
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          sku: string
          name: string
          category: string | null
          price: number | null
          created_at: string | null
          reorder_point: number | null
          reorder_quantity: number | null
          lead_time_days: number | null
          owner_id: string | null
          barcode: string | null
          item_type: item_type
          stock_behavior: stock_behavior
          pricing_model: pricing_model
          pricing_tiers: Json | null
          duration_minutes: number | null
          tenant_id: string
          image_url?: string | null
        }
        Insert: {
          id?: string
          sku: string
          name: string
          category: string | null
          price: number | null
          created_at?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          lead_time_days?: number | null
          owner_id: string | null
          barcode: string | null
          item_type?: item_type
          stock_behavior?: stock_behavior
          pricing_model?: pricing_model
          pricing_tiers: Json | null
          duration_minutes: number | null
          tenant_id: string
          image_url?: string | null
        }
        Update: {
          id?: string
          sku?: string
          name?: string
          category?: string | null
          price?: number | null
          created_at?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          lead_time_days?: number | null
          owner_id?: string | null
          barcode?: string | null
          item_type?: item_type
          stock_behavior?: stock_behavior
          pricing_model?: pricing_model
          pricing_tiers?: Json | null
          duration_minutes?: number | null
          tenant_id?: string
          image_url?: string | null
        }
      }
      promotions: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          type: string
          discount_amount: number | null
          discount_percentage: number | null
          min_purchase: number | null
          max_discount: number | null
          applicable_products: any | null
          applicable_categories: any | null
          buy_quantity: number | null
          get_quantity: number | null
          get_product_id: string | null
          start_date: string | null
          end_date: string | null
          is_active: boolean | null
          max_uses: number | null
          uses_count: number | null
          max_uses_per_customer: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          description: string | null
          type: string
          discount_amount: number | null
          discount_percentage: number | null
          min_purchase: number | null
          max_discount: number | null
          applicable_products: any | null
          applicable_categories: any | null
          buy_quantity: number | null
          get_quantity: number | null
          get_product_id: string | null
          start_date: string | null
          end_date: string | null
          is_active?: boolean | null
          max_uses: number | null
          uses_count?: number | null
          max_uses_per_customer: number | null
          created_by: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          type?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          min_purchase?: number | null
          max_discount?: number | null
          applicable_products?: any | null
          applicable_categories?: any | null
          buy_quantity?: number | null
          get_quantity?: number | null
          get_product_id?: string | null
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          uses_count?: number | null
          max_uses_per_customer?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
        }
      }
      qris_config: {
        Row: {
          id: string
          merchant_name: string
          merchant_city: string
          merchant_id: string
          merchant_category_code: string | null
          postal_code: string | null
          country_code: string | null
          currency_code: string | null
          tip_indicator: string | null
          is_active: boolean | null
          created_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          merchant_name: string
          merchant_city: string
          merchant_id: string
          merchant_category_code?: string | null
          postal_code: string | null
          country_code?: string | null
          currency_code?: string | null
          tip_indicator?: string | null
          is_active?: boolean | null
          created_at?: string | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          merchant_name?: string
          merchant_city?: string
          merchant_id?: string
          merchant_category_code?: string | null
          postal_code?: string | null
          country_code?: string | null
          currency_code?: string | null
          tip_indicator?: string | null
          is_active?: boolean | null
          created_at?: string | null
          tenant_id?: string | null
        }
      }
      refresh_tokens: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          expires_at: string
          created_at: string
          used_at: string | null
          revoked_at: string | null
          device_info: Json | null
          ip_address: string | null
        }
        Insert: {
          id?: string
          user_id: string
          token_hash: string
          expires_at: string
          created_at?: string
          used_at: string | null
          revoked_at: string | null
          device_info: Json | null
          ip_address: string | null
        }
        Update: {
          id?: string
          user_id?: string
          token_hash?: string
          expires_at?: string
          created_at?: string
          used_at?: string | null
          revoked_at?: string | null
          device_info?: Json | null
          ip_address?: string | null
        }
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          role_id?: string
          permission_id?: string
          created_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          tenant_id: string | null
          key: string
          name: string
          description: string | null
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string | null
          key: string
          name: string
          description: string | null
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          key?: string
          name?: string
          description?: string | null
          is_system?: boolean
          created_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          tenant_id: string
          outlet_id: string
          device_id: string | null
          cashier_user_id: string
          status: string
          opening_cash: number
          cash_sales: number
          cash_refunds: number
          cash_in: number
          cash_out: number
          expected_cash: number | null
          actual_cash: number | null
          cash_difference: number | null
          cashier_note: string | null
          manager_note: string | null
          opened_at: string
          closed_at: string | null
          submitted_at: string | null
          approved_by: string | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          outlet_id: string
          device_id: string | null
          cashier_user_id: string
          status?: string
          opening_cash?: number
          cash_sales?: number
          cash_refunds?: number
          cash_in?: number
          cash_out?: number
          expected_cash: number | null
          actual_cash: number | null
          cash_difference: number | null
          cashier_note: string | null
          manager_note: string | null
          opened_at?: string
          closed_at: string | null
          submitted_at: string | null
          approved_by: string | null
          approved_at: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          outlet_id?: string
          device_id?: string | null
          cashier_user_id?: string
          status?: string
          opening_cash?: number
          cash_sales?: number
          cash_refunds?: number
          cash_in?: number
          cash_out?: number
          expected_cash?: number | null
          actual_cash?: number | null
          cash_difference?: number | null
          cashier_note?: string | null
          manager_note?: string | null
          opened_at?: string
          closed_at?: string | null
          submitted_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
        }
      }
      stock_alerts: {
        Row: {
          id: string
          product_id: string | null
          outlet_id: string | null
          alert_type: string
          current_stock: number
          reorder_point: number
          is_acknowledged: boolean | null
          acknowledged_by: string | null
          acknowledged_at: string | null
          created_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          product_id: string | null
          outlet_id: string | null
          alert_type: string
          current_stock: number
          reorder_point: number
          is_acknowledged?: boolean | null
          acknowledged_by: string | null
          acknowledged_at: string | null
          created_at?: string | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          outlet_id?: string | null
          alert_type?: string
          current_stock?: number
          reorder_point?: number
          is_acknowledged?: boolean | null
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          created_at?: string | null
          tenant_id?: string | null
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          outlet_id: string
          user_id: string
          movement_type: string
          quantity: number
          previous_stock: number
          new_stock: number
          reason: string | null
          created_at: string
          tenant_id: string
          reference_type: string | null
          reference_id: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          product_id: string
          outlet_id: string
          user_id: string
          movement_type: string
          quantity: number
          previous_stock: number
          new_stock: number
          reason: string | null
          created_at?: string
          tenant_id: string
          reference_type: string | null
          reference_id: string | null
          notes: string | null
        }
        Update: {
          id?: string
          product_id?: string
          outlet_id?: string
          user_id?: string
          movement_type?: string
          quantity?: number
          previous_stock?: number
          new_stock?: number
          reason?: string | null
          created_at?: string
          tenant_id?: string
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
        }
      }
      tenants: {
        Row: {
          id: string
          name: string
          slug: string | null
          status: string
          plan: string
          owner_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string | null
          status?: string
          plan?: string
          owner_user_id: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          status?: string
          plan?: string
          owner_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transaction_approvals: {
        Row: {
          id: string
          tenant_id: string
          outlet_id: string
          transaction_id: string | null
          shift_id: string | null
          action_type: string
          requested_by: string
          approved_by: string | null
          status: string
          reason: string
          amount: number | null
          requested_at: string
          decided_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          outlet_id: string
          transaction_id: string | null
          shift_id: string | null
          action_type: string
          requested_by: string
          approved_by: string | null
          status?: string
          reason: string
          amount: number | null
          requested_at?: string
          decided_at: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          outlet_id?: string
          transaction_id?: string | null
          shift_id?: string | null
          action_type?: string
          requested_by?: string
          approved_by?: string | null
          status?: string
          reason?: string
          amount?: number | null
          requested_at?: string
          decided_at?: string | null
          created_at?: string
        }
      }
      transaction_items: {
        Row: {
          id: string
          transaction_id: string | null
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          unit_price: number
          line_total: number
          created_at: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          transaction_id: string | null
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          unit_price: number
          line_total: number
          created_at?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          transaction_id?: string | null
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          unit_price?: number
          line_total?: number
          created_at?: string | null
          tenant_id?: string
        }
      }
      transactions: {
        Row: {
          id: string
          transaction_id: string
          outlet_id: string | null
          cashier_id: string | null
          status: string
          subtotal: number
          discount_amount: number | null
          tax_amount: number | null
          total_amount: number
          payment_method: string
          amount_paid: number
          change_amount: number | null
          void_reason: string | null
          voided_by: string | null
          voided_at: string | null
          refund_reason: string | null
          refunded_by: string | null
          refunded_at: string | null
          refund_amount: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          tenant_id: string
          device_id: string | null
          shift_id: string | null
        }
        Insert: {
          id?: string
          transaction_id: string
          outlet_id: string | null
          cashier_id: string | null
          status?: string
          subtotal: number
          discount_amount?: number | null
          tax_amount?: number | null
          total_amount: number
          payment_method: string
          amount_paid: number
          change_amount?: number | null
          void_reason: string | null
          voided_by: string | null
          voided_at: string | null
          refund_reason: string | null
          refunded_by: string | null
          refunded_at: string | null
          refund_amount: number | null
          notes: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id: string
          device_id: string | null
          shift_id: string | null
        }
        Update: {
          id?: string
          transaction_id?: string
          outlet_id?: string | null
          cashier_id?: string | null
          status?: string
          subtotal?: number
          discount_amount?: number | null
          tax_amount?: number | null
          total_amount?: number
          payment_method?: string
          amount_paid?: number
          change_amount?: number | null
          void_reason?: string | null
          voided_by?: string | null
          voided_at?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          refunded_at?: string | null
          refund_amount?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string
          device_id?: string | null
          shift_id?: string | null
        }
      }
      user_role_assignments: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role_id: string
          scope_type: string
          outlet_id: string | null
          outlet_group_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role_id: string
          scope_type: string
          outlet_id: string | null
          outlet_group_id: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role_id?: string
          scope_type?: string
          outlet_id?: string | null
          outlet_group_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          password_hash: string
          outlet_id: string | null
          role: string | null
          created_at: string | null
          permissions: Json | null
          plan: string
          whatsapp_number: string | null
          is_trial: boolean
          trial_ends_at: string | null
          email_verified_at: string | null
          email_verify_token: string | null
          is_suspended: boolean
          tenant_id: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          password_hash: string
          outlet_id: string | null
          role?: string | null
          created_at?: string | null
          permissions?: Json | null
          plan?: string
          whatsapp_number: string | null
          is_trial?: boolean
          trial_ends_at: string | null
          email_verified_at: string | null
          email_verify_token: string | null
          is_suspended?: boolean
          tenant_id: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          password_hash?: string
          outlet_id?: string | null
          role?: string | null
          created_at?: string | null
          permissions?: Json | null
          plan?: string
          whatsapp_number?: string | null
          is_trial?: boolean
          trial_ends_at?: string | null
          email_verified_at?: string | null
          email_verify_token?: string | null
          is_suspended?: boolean
          tenant_id?: string
        }
      }
      wa_templates: {
        Row: {
          id: string
          name: string
          type: string
          content: string
          variables: Json | null
          is_active: boolean | null
          created_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          content: string
          variables: Json | null
          is_active?: boolean | null
          created_at?: string | null
          tenant_id: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          content?: string
          variables?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          tenant_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
    Enums: {
      business_type: business_type
      item_type: item_type
      pricing_model: pricing_model
      stock_behavior: stock_behavior
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

