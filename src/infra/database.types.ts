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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      _migrations: {
        Row: {
          applied_at: string
          filename: string
          id: number
        }
        Insert: {
          applied_at?: string
          filename: string
          id?: number
        }
        Update: {
          applied_at?: string
          filename?: string
          id?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_role_key: string | null
          actor_user_id: string | null
          changes: Json | null
          created_at: string
          device_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          impersonation_id: string | null
          ip_address: string | null
          metadata: Json | null
          outlet_id: string | null
          shift_id: string | null
          tenant_id: string | null
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          action: string
          actor_role_key?: string | null
          actor_user_id?: string | null
          changes?: Json | null
          created_at?: string
          device_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          impersonation_id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          outlet_id?: string | null
          shift_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          action?: string
          actor_role_key?: string | null
          actor_user_id?: string | null
          changes?: Json | null
          created_at?: string
          device_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          impersonation_id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          outlet_id?: string | null
          shift_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_history: {
        Row: {
          amount: number
          changed_by: string | null
          created_at: string
          id: string
          is_trial: boolean
          note: string | null
          plan: string
          previous_plan: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          changed_by?: string | null
          created_at?: string
          id?: string
          is_trial?: boolean
          note?: string | null
          plan: string
          previous_plan?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          changed_by?: string | null
          created_at?: string
          id?: string
          is_trial?: boolean
          note?: string | null
          plan?: string
          previous_plan?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          enabled_modules: Json
          id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          enabled_modules?: Json
          id?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          enabled_modules?: Json
          id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "cash_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_member: boolean
          joined_at: string | null
          member_code: string | null
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_member?: boolean
          joined_at?: string | null
          member_code?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_member?: boolean
          joined_at?: string | null
          member_code?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          outlet_id?: string | null
          product_id?: string | null
          quantity_sold?: number
          revenue?: number | null
          sale_date: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          outlet_id?: string | null
          product_id?: string | null
          quantity_sold?: number
          revenue?: number | null
          sale_date?: string
          tenant_id?: string
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
          {
            foreignKeyName: "daily_sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "daily_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          end_reason: string | null
          ended_at: string | null
          ended_by: string | null
          expires_at: string
          id: string
          impersonator_id: string
          ip_address: string | null
          reason: string
          started_at: string
          target_user_id: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          expires_at: string
          id?: string
          impersonator_id: string
          ip_address?: string | null
          reason: string
          started_at?: string
          target_user_id: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          expires_at?: string
          id?: string
          impersonator_id?: string
          ip_address?: string | null
          reason?: string
          started_at?: string
          target_user_id?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_impersonator_id_fkey"
            columns: ["impersonator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          delta: number
          id: string
          note: string | null
          program_id: string
          reason: string
          tenant_id: string
          transaction_id: string | null
          voucher_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          delta: number
          id?: string
          note?: string | null
          program_id: string
          reason: string
          tenant_id: string
          transaction_id?: string | null
          voucher_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delta?: number
          id?: string
          note?: string | null
          program_id?: string
          reason?: string
          tenant_id?: string
          transaction_id?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "member_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanics: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_vouchers: {
        Row: {
          code: string
          created_by: string | null
          customer_id: string
          expires_at: string | null
          id: string
          issued_at: string
          program_id: string | null
          redeemed_at: string | null
          redeemed_transaction_id: string | null
          reward: Json
          source: string
          source_transaction_id: string | null
          status: string
          tenant_id: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          code: string
          created_by?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          program_id?: string | null
          redeemed_at?: string | null
          redeemed_transaction_id?: string | null
          reward: Json
          source: string
          source_transaction_id?: string | null
          status?: string
          tenant_id: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          code?: string
          created_by?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          program_id?: string | null
          redeemed_at?: string | null
          redeemed_transaction_id?: string | null
          reward?: Json
          source?: string
          source_transaction_id?: string | null
          status?: string
          tenant_id?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_vouchers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_vouchers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_vouchers_redeemed_transaction_id_fkey"
            columns: ["redeemed_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_vouchers_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_vouchers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_ops: {
        Row: {
          created_at: string
          device_id: string | null
          error: string | null
          kind: string
          occurred_at: string | null
          op_id: string
          result: Json | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          error?: string | null
          kind: string
          occurred_at?: string | null
          op_id: string
          result?: Json | null
          status: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          error?: string | null
          kind?: string
          occurred_at?: string | null
          op_id?: string
          result?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_ops_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          is_voided: boolean | null
          outlet_id: string
          receipt_url: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          is_voided?: boolean | null
          outlet_id: string
          receipt_url?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_voided?: boolean | null
          outlet_id?: string
          receipt_url?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_expenses_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_expenses_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_group_members: {
        Row: {
          created_at: string
          outlet_group_id: string
          outlet_id: string
        }
        Insert: {
          created_at?: string
          outlet_group_id: string
          outlet_id: string
        }
        Update: {
          created_at?: string
          outlet_group_id?: string
          outlet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_group_members_outlet_group_id_fkey"
            columns: ["outlet_group_id"]
            isOneToOne: false
            referencedRelation: "outlet_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_group_members_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          tenant_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          tenant_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          performed_by?: string | null
          reason?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          performed_by?: string | null
          reason?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "payment_confirmations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          crypto_amount: number | null
          crypto_token: string | null
          crypto_tx_hash: string | null
          id: string
          payment_method: string
          plan: string
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string | null
          unique_amount: number | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          crypto_amount?: number | null
          crypto_token?: string | null
          crypto_tx_hash?: string | null
          id?: string
          payment_method?: string
          plan: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string | null
          unique_amount?: number | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          crypto_amount?: number | null
          crypto_token?: string | null
          crypto_tx_hash?: string | null
          id?: string
          payment_method?: string
          plan?: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string | null
          unique_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          module: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          module?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          module?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_devices: {
        Row: {
          created_at: string
          device_code: string
          id: string
          last_seen_at: string | null
          name: string
          outlet_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_code: string
          id?: string
          last_seen_at?: string | null
          name: string
          outlet_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_code?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          outlet_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_devices_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_code_counters: {
        Row: {
          kind: string
          last_value: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          kind: string
          last_value?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          kind?: string
          last_value?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_code_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          item_type: Database["public"]["Enums"]["item_type"]
          lead_time_days: number | null
          name: string
          owner_id: string | null
          price: number | null
          pricing_model: Database["public"]["Enums"]["pricing_model"]
          pricing_tiers: Json | null
          reorder_point: number | null
          reorder_quantity: number | null
          sku: string
          stock_behavior: Database["public"]["Enums"]["stock_behavior"]
          tenant_id: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          item_type?: Database["public"]["Enums"]["item_type"]
          lead_time_days?: number | null
          name: string
          owner_id?: string | null
          price?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          pricing_tiers?: Json | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          sku: string
          stock_behavior?: Database["public"]["Enums"]["stock_behavior"]
          tenant_id: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          item_type?: Database["public"]["Enums"]["item_type"]
          lead_time_days?: number | null
          name?: string
          owner_id?: string | null
          price?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          pricing_tiers?: Json | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          sku?: string
          stock_behavior?: Database["public"]["Enums"]["stock_behavior"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "promotions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          tip_indicator?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qris_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          updated_at?: string
          window_start?: string
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
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_items: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          price_note: string | null
          price_reason: string | null
          product_id: string
          quantity: number
          service_order_id: string
          tenant_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          price_note?: string | null
          price_reason?: string | null
          product_id: string
          quantity: number
          service_order_id: string
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          price_note?: string | null
          price_reason?: string | null
          product_id?: string
          quantity?: number
          service_order_id?: string
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          cancel_reason: string | null
          cancelled_by: string | null
          closed_at: string | null
          complaint: string | null
          created_at: string
          customer_id: string | null
          discount_note: string | null
          discount_reason: string | null
          id: string
          manual_discount: number
          mechanic_id: string | null
          odometer_km: number | null
          opened_at: string
          opened_by: string | null
          outlet_id: string
          status: string
          tenant_id: string
          transaction_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_by?: string | null
          closed_at?: string | null
          complaint?: string | null
          created_at?: string
          customer_id?: string | null
          discount_note?: string | null
          discount_reason?: string | null
          id?: string
          manual_discount?: number
          mechanic_id?: string | null
          odometer_km?: number | null
          opened_at?: string
          opened_by?: string | null
          outlet_id: string
          status?: string
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_by?: string | null
          closed_at?: string | null
          complaint?: string | null
          created_at?: string
          customer_id?: string | null
          discount_note?: string | null
          discount_reason?: string | null
          id?: string
          manual_discount?: number
          mechanic_id?: string | null
          odometer_km?: number | null
          opened_at?: string
          opened_by?: string | null
          outlet_id?: string
          status?: string
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          actual_cash: number | null
          approved_at: string | null
          approved_by: string | null
          cash_difference: number | null
          cash_in: number
          cash_out: number
          cash_refunds: number
          cash_sales: number
          cashier_note: string | null
          cashier_user_id: string
          closed_at: string | null
          device_id: string | null
          expected_cash: number | null
          id: string
          manager_note: string | null
          opened_at: string
          opening_cash: number
          outlet_id: string
          status: string
          submitted_at: string | null
          tenant_id: string
        }
        Insert: {
          actual_cash?: number | null
          approved_at?: string | null
          approved_by?: string | null
          cash_difference?: number | null
          cash_in?: number
          cash_out?: number
          cash_refunds?: number
          cash_sales?: number
          cashier_note?: string | null
          cashier_user_id: string
          closed_at?: string | null
          device_id?: string | null
          expected_cash?: number | null
          id?: string
          manager_note?: string | null
          opened_at?: string
          opening_cash?: number
          outlet_id: string
          status?: string
          submitted_at?: string | null
          tenant_id: string
        }
        Update: {
          actual_cash?: number | null
          approved_at?: string | null
          approved_by?: string | null
          cash_difference?: number | null
          cash_in?: number
          cash_out?: number
          cash_refunds?: number
          cash_sales?: number
          cashier_note?: string | null
          cashier_user_id?: string
          closed_at?: string | null
          device_id?: string | null
          expected_cash?: number | null
          id?: string
          manager_note?: string | null
          opened_at?: string
          opening_cash?: number
          outlet_id?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_cashier_user_id_fkey"
            columns: ["cashier_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "stock_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          new_stock: number
          notes: string | null
          outlet_id: string
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          new_stock: number
          notes?: string | null
          outlet_id: string
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          new_stock?: number
          notes?: string | null
          outlet_id?: string
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          plan: string
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          plan?: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          plan?: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_approvals: {
        Row: {
          action_type: string
          amount: number | null
          approved_by: string | null
          created_at: string
          decided_at: string | null
          id: string
          outlet_id: string
          pin_verified_at: string | null
          reason: string
          requested_at: string
          requested_by: string
          shift_id: string | null
          status: string
          tenant_id: string
          transaction_id: string | null
        }
        Insert: {
          action_type: string
          amount?: number | null
          approved_by?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          outlet_id: string
          pin_verified_at?: string | null
          reason: string
          requested_at?: string
          requested_by: string
          shift_id?: string | null
          status?: string
          tenant_id: string
          transaction_id?: string | null
        }
        Update: {
          action_type?: string
          amount?: number | null
          approved_by?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          outlet_id?: string
          pin_verified_at?: string | null
          reason?: string
          requested_at?: string
          requested_by?: string
          shift_id?: string | null
          status?: string
          tenant_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_approvals_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_approvals_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_approvals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          created_at: string | null
          discount_note: string | null
          discount_reason: string | null
          id: string
          line_total: number
          list_price: number | null
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          tenant_id: string
          transaction_id: string | null
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          discount_note?: string | null
          discount_reason?: string | null
          id?: string
          line_total: number
          list_price?: number | null
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          tenant_id: string
          transaction_id?: string | null
          unit_cost?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          discount_note?: string | null
          discount_reason?: string | null
          id?: string
          line_total?: number
          list_price?: number | null
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          tenant_id?: string
          transaction_id?: string | null
          unit_cost?: number | null
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
            foreignKeyName: "transaction_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          customer_id: string | null
          device_id: string | null
          discount_amount: number | null
          discount_note: string | null
          discount_reason: string | null
          id: string
          manual_discount: number
          notes: string | null
          outlet_id: string | null
          payment_method: string
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          refunded_by: string | null
          service_order_id: string | null
          shift_id: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          transaction_id: string
          updated_at: string | null
          vehicle_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voucher_discount: number
          voucher_id: string | null
        }
        Insert: {
          amount_paid: number
          cashier_id?: string | null
          change_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          device_id?: string | null
          discount_amount?: number | null
          discount_note?: string | null
          discount_reason?: string | null
          id?: string
          manual_discount?: number
          notes?: string | null
          outlet_id?: string | null
          payment_method: string
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          service_order_id?: string | null
          shift_id?: string | null
          status?: string
          subtotal: number
          tax_amount?: number | null
          tenant_id: string
          total_amount: number
          transaction_id: string
          updated_at?: string | null
          vehicle_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voucher_discount?: number
          voucher_id?: string | null
        }
        Update: {
          amount_paid?: number
          cashier_id?: string | null
          change_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          device_id?: string | null
          discount_amount?: number | null
          discount_note?: string | null
          discount_reason?: string | null
          id?: string
          manual_discount?: number
          notes?: string | null
          outlet_id?: string | null
          payment_method?: string
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          service_order_id?: string | null
          shift_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          transaction_id?: string
          updated_at?: string | null
          vehicle_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voucher_discount?: number
          voucher_id?: string | null
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
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
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
            foreignKeyName: "transactions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "member_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          created_at: string
          id: string
          outlet_group_id: string | null
          outlet_id: string | null
          role_id: string
          scope_type: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outlet_group_id?: string | null
          outlet_id?: string | null
          role_id: string
          scope_type: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outlet_group_id?: string | null
          outlet_id?: string | null
          role_id?: string
          scope_type?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
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
          email_verified_at: string | null
          email_verify_token: string | null
          id: string
          is_suspended: boolean
          is_trial: boolean
          name: string
          outlet_id: string | null
          password_hash: string
          permissions: Json | null
          pin_code_hash: string | null
          plan: string
          plan_expires_at: string | null
          role: string | null
          tenant_id: string
          trial_ends_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_verified_at?: string | null
          email_verify_token?: string | null
          id?: string
          is_suspended?: boolean
          is_trial?: boolean
          name: string
          outlet_id?: string | null
          password_hash: string
          permissions?: Json | null
          pin_code_hash?: string | null
          plan?: string
          plan_expires_at?: string | null
          role?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_verified_at?: string | null
          email_verify_token?: string | null
          id?: string
          is_suspended?: boolean
          is_trial?: boolean
          name?: string
          outlet_id?: string | null
          password_hash?: string
          permissions?: Json | null
          pin_code_hash?: string | null
          plan?: string
          plan_expires_at?: string | null
          role?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          created_at: string
          customer_id: string | null
          id: string
          model: string | null
          plate_number: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          model?: string | null
          plate_number: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          model?: string | null
          plate_number?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
          type: string
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          type: string
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          type?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payment_methods_public: {
        Row: {
          code: string | null
          display_order: number | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          type: string | null
        }
        Insert: {
          code?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          type?: string | null
        }
        Update: {
          code?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          type?: string | null
        }
        Relationships: []
      }
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
      add_daily_sale: {
        Args: {
          p_outlet_id: string
          p_product_id: string
          p_quantity: number
          p_revenue: number
          p_sale_date: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      approve_shift: {
        Args: {
          p_action?: string
          p_approver_id: string
          p_manager_note?: string
          p_shift_id: string
        }
        Returns: undefined
      }
      assign_missing_barcodes: {
        Args: { p_product_ids?: string[]; p_tenant_id: string }
        Returns: {
          barcode: string
          product_id: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      claim_member_voucher: {
        Args: { p_code: string; p_customer_id: string; p_tenant_id: string }
        Returns: Json
      }
      claim_offline_op: {
        Args: {
          p_device_id: string
          p_kind: string
          p_occurred_at: string
          p_op_id: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          claimed: boolean
          error: string
          result: Json
          status: string
        }[]
      }
      cleanup_expired_refresh_tokens: { Args: never; Returns: undefined }
      compute_expected_cash: { Args: { p_shift_id: string }; Returns: number }
      current_stock_levels: {
        Args: { p_tenant_id: string }
        Returns: {
          outlet_id: string
          product_id: string
          stock: number
          stock_date: string
        }[]
      }
      effective_plan: {
        Args: { u: Database["public"]["Tables"]["users"]["Row"] }
        Returns: string
      }
      get_daily_expense_summary: {
        Args: { p_date?: string; p_outlet_id: string }
        Returns: {
          category: string
          count: number
          total: number
        }[]
      }
      get_expense_summary: {
        Args: {
          p_end_date: string
          p_outlet_ids: string[]
          p_start_date: string
        }
        Returns: {
          expense_count: number
          total_expenses: number
        }[]
      }
      get_sales_summary: {
        Args: {
          p_end_date: string
          p_outlet_ids: string[]
          p_start_date: string
        }
        Returns: {
          total_cogs: number
          total_items_sold: number
          total_revenue: number
          transaction_count: number
          uncosted_lines: number
        }[]
      }
      get_sales_trend: {
        Args: {
          p_end_date: string
          p_outlet_ids: string[]
          p_start_date: string
        }
        Returns: {
          items_sold: number
          revenue: number
          sale_date: string
        }[]
      }
      get_top_products: {
        Args: {
          p_end_date: string
          p_limit?: number
          p_outlet_ids: string[]
          p_start_date: string
        }
        Returns: {
          product_id: string
          product_name: string
          product_sku: string
          total_quantity: number
          total_revenue: number
        }[]
      }
      get_user_outlet_ids: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: string[]
      }
      grant_plan: {
        Args: { p_days?: number; p_plan: string; p_user_id: string }
        Returns: string
      }
      internal_ean13: { Args: { p_n: number }; Returns: string }
      link_voucher_to_sale: {
        Args: { p_transaction_id: string; p_voucher_id: string }
        Returns: undefined
      }
      loyalty_award_stamps: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      loyalty_reverse_sale: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      next_product_codes: {
        Args: { p_count?: number; p_kind: string; p_tenant_id: string }
        Returns: number[]
      }
      plan_grace_period: { Args: never; Returns: string }
      plan_period_ends_at: {
        Args: { u: Database["public"]["Tables"]["users"]["Row"] }
        Returns: string
      }
      release_member_voucher: {
        Args: { p_voucher_id: string }
        Returns: undefined
      }
      shift_cash_refunds: { Args: { p_shift_id: string }; Returns: number }
      shift_cash_sales: { Args: { p_shift_id: string }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_shift: {
        Args: {
          p_actual_cash: number
          p_cashier_note?: string
          p_shift_id: string
        }
        Returns: undefined
      }
      user_has_permission: {
        Args: {
          p_outlet_id?: string
          p_permission_key: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      business_type: "FNB" | "RETAIL" | "SERVICE" | "HYBRID"
      item_type: "PRODUCT" | "MENU" | "SERVICE" | "PACKAGE"
      pricing_model: "FIXED" | "TIERED" | "TIME_BASED"
      stock_behavior: "TRACKED" | "UNTRACKED" | "CONSUMED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      business_type: ["FNB", "RETAIL", "SERVICE", "HYBRID"],
      item_type: ["PRODUCT", "MENU", "SERVICE", "PACKAGE"],
      pricing_model: ["FIXED", "TIERED", "TIME_BASED"],
      stock_behavior: ["TRACKED", "UNTRACKED", "CONSUMED"],
    },
  },
} as const
