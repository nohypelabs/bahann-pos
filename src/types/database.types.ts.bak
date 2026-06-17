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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string | null
          bank_name: string
          branch: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          logo_url: string | null
          swift_code: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code?: string | null
          bank_name: string
          branch?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          logo_url?: string | null
          swift_code?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string | null
          bank_name?: string
          branch?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          logo_url?: string | null
          swift_code?: string | null
        }
        Relationships: []
      }
      cash_sessions: {
        Row: {
          actual_cash: number | null
          card_sales: number | null
          cash_sales: number | null
          closed_at: string | null
          closed_by: string | null
          closing_cash: number | null
          created_at: string | null
          difference: number | null
          ewallet_sales: number | null
          expected_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_cash: number
          outlet_id: string | null
          status: string | null
          total_discount: number | null
          total_sales: number | null
          total_transactions: number | null
          transfer_sales: number | null
          updated_at: string | null
        }
        Insert: {
          actual_cash?: number | null
          card_sales?: number | null
          cash_sales?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string | null
          difference?: number | null
          ewallet_sales?: number | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at: string
          opened_by?: string | null
          opening_cash: number
          outlet_id?: string | null
          status?: string | null
          total_discount?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          transfer_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_cash?: number | null
          card_sales?: number | null
          cash_sales?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string | null
          difference?: number | null
          ewallet_sales?: number | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_cash?: number
          outlet_id?: string | null
          status?: string | null
          total_discount?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          transfer_sales?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales: {
        Row: {
          created_at: string | null
          id: string
          outlet_id: string | null
          product_id: string | null
          quantity_sold: number
          revenue: number | null
          sale_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          outlet_id?: string | null
          product_id?: string | null
          quantity_sold?: number
          revenue?: number | null
          sale_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          outlet_id?: string | null
          product_id?: string | null
          quantity_sold?: number
          revenue?: number | null
          sale_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stock: {
        Row: {
          created_at: string | null
          id: string
          outlet_id: string | null
          product_id: string | null
          stock_akhir: number | null
          stock_awal: number | null
          stock_date: string
          stock_in: number | null
          stock_out: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          outlet_id?: string | null
          product_id?: string | null
          stock_akhir?: number | null
          stock_awal?: number | null
          stock_date: string
          stock_in?: number | null
          stock_out?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          outlet_id?: string | null
          product_id?: string | null
          stock_akhir?: number | null
          stock_awal?: number | null
          stock_date?: string
          stock_in?: number | null
          stock_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_stock_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          updated_at: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          updated_at?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          updated_at?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_confirmations: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          payment_id: string | null
          performed_by: string | null
          reason: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          performed_by?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          performed_by?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_confirmations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_details: Json | null
          code: string
          created_at: string | null
          display_order: number | null
          fee_amount: number | null
          fee_percentage: number | null
          icon: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          requires_confirmation: boolean | null
          type: string
          updated_at: string | null
        }
        Insert: {
          account_details?: Json | null
          code: string
          created_at?: string | null
          display_order?: number | null
          fee_amount?: number | null
          fee_percentage?: number | null
          icon?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          requires_confirmation?: boolean | null
          type: string
          updated_at?: string | null
        }
        Update: {
          account_details?: Json | null
          code?: string
          created_at?: string | null
          display_order?: number | null
          fee_amount?: number | null
          fee_percentage?: number | null
          icon?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          requires_confirmation?: boolean | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          confirmation_notes: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          expired_at: string | null
          fee: number | null
          id: string
          payment_method_id: string | null
          payment_proof_url: string | null
          qris_content: string | null
          reference_number: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
          wa_message_id: string | null
          wa_sent_at: string | null
          wa_status: string | null
        }
        Insert: {
          amount: number
          confirmation_notes?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expired_at?: string | null
          fee?: number | null
          id?: string
          payment_method_id?: string | null
          payment_proof_url?: string | null
          qris_content?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          wa_message_id?: string | null
          wa_sent_at?: string | null
          wa_status?: string | null
        }
        Update: {
          amount?: number
          confirmation_notes?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expired_at?: string | null
          fee?: number | null
          id?: string
          payment_method_id?: string | null
          payment_proof_url?: string | null
          qris_content?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          wa_message_id?: string | null
          wa_sent_at?: string | null
          wa_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          lead_time_days: number | null
          name: string
          price: number | null
          reorder_point: number | null
          reorder_quantity: number | null
          sku: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          lead_time_days?: number | null
          name: string
          price?: number | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          sku: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          lead_time_days?: number | null
          name?: string
          price?: number | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          sku?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: string[] | null
          buy_quantity: number | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          get_product_id: string | null
          get_quantity: number | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          max_uses_per_customer: number | null
          min_purchase: number | null
          name: string
          start_date: string | null
          type: string
          updated_at: string | null
          uses_count: number | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          buy_quantity?: number | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          get_product_id?: string | null
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_purchase?: number | null
          name: string
          start_date?: string | null
          type: string
          updated_at?: string | null
          uses_count?: number | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          buy_quantity?: number | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          get_product_id?: string | null
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_purchase?: number | null
          name?: string
          start_date?: string | null
          type?: string
          updated_at?: string | null
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_get_product_id_fkey"
            columns: ["get_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      qris_config: {
        Row: {
          country_code: string | null
          created_at: string | null
          currency_code: string | null
          id: string
          is_active: boolean | null
          merchant_category_code: string | null
          merchant_city: string
          merchant_id: string
          merchant_name: string
          postal_code: string | null
          tip_indicator: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          is_active?: boolean | null
          merchant_category_code?: string | null
          merchant_city: string
          merchant_id: string
          merchant_name: string
          postal_code?: string | null
          tip_indicator?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          is_active?: boolean | null
          merchant_category_code?: string | null
          merchant_city?: string
          merchant_id?: string
          merchant_name?: string
          postal_code?: string | null
          tip_indicator?: string | null
        }
        Relationships: []
      }
      refresh_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: string | null
          revoked_at: string | null
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          current_stock: number
          id: string
          is_acknowledged: boolean | null
          outlet_id: string | null
          product_id: string | null
          reorder_point: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          current_stock: number
          id?: string
          is_acknowledged?: boolean | null
          outlet_id?: string | null
          product_id?: string | null
          reorder_point: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          current_stock?: number
          id?: string
          is_acknowledged?: boolean | null
          outlet_id?: string | null
          product_id?: string | null
          reorder_point?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          created_at: string | null
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          transaction_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_total: number
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          transaction_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          transaction_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_paid: number
          cashier_id: string | null
          change_amount: number | null
          created_at: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          outlet_id: string | null
          payment_method: string
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          refunded_by: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          transaction_id: string
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_paid: number
          cashier_id?: string | null
          change_amount?: number | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          outlet_id?: string | null
          payment_method: string
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          status?: string
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          transaction_id: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_paid?: number
          cashier_id?: string | null
          change_amount?: number | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          outlet_id?: string | null
          payment_method?: string
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          transaction_id?: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          outlet_id: string | null
          password_hash: string
          permissions: Json | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          outlet_id?: string | null
          password_hash: string
          permissions?: Json | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          outlet_id?: string | null
          password_hash?: string
          permissions?: Json | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          variables?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      stock_sales_monitor: {
        Row: {
          date: string | null
          outlet: string | null
          product: string | null
          revenue: number | null
          sold: number | null
          stock_akhir: number | null
          stock_awal: number | null
          stock_in: number | null
          stock_out: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_refresh_tokens: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
