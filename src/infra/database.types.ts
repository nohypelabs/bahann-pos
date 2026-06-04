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
      users: {
        Row: {
          id: string
          email: string
          name: string
          password_hash: string
          outlet_id: string | null
          role: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          password_hash: string
          outlet_id?: string | null
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          password_hash?: string
          outlet_id?: string | null
          role?: string | null
          created_at?: string | null
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
      products: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
          price: number | null
          sku: string
          barcode: string | null
          owner_id: string | null
          item_type: Database["public"]["Enums"]["item_type"]
          stock_behavior: Database["public"]["Enums"]["stock_behavior"]
          pricing_model: Database["public"]["Enums"]["pricing_model"]
          pricing_tiers: Json | null
          duration_minutes: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          price?: number | null
          sku: string
          barcode?: string | null
          owner_id?: string | null
          item_type?: Database["public"]["Enums"]["item_type"]
          stock_behavior?: Database["public"]["Enums"]["stock_behavior"]
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          pricing_tiers?: Json | null
          duration_minutes?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number | null
          sku?: string
          barcode?: string | null
          owner_id?: string | null
          item_type?: Database["public"]["Enums"]["item_type"]
          stock_behavior?: Database["public"]["Enums"]["stock_behavior"]
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          pricing_tiers?: Json | null
          duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          id: string
          user_id: string
          business_type: Database["public"]["Enums"]["business_type"]
          enabled_modules: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_type?: Database["public"]["Enums"]["business_type"]
          enabled_modules?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          enabled_modules?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Enums: {
      business_type: "FNB" | "RETAIL" | "SERVICE" | "HYBRID"
      item_type: "PRODUCT" | "MENU" | "SERVICE" | "PACKAGE"
      stock_behavior: "TRACKED" | "UNTRACKED" | "CONSUMED"
      pricing_model: "FIXED" | "TIERED" | "TIME_BASED"
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
      business_type: ["FNB", "RETAIL", "SERVICE", "HYBRID"] as const,
      item_type: ["PRODUCT", "MENU", "SERVICE", "PACKAGE"] as const,
      stock_behavior: ["TRACKED", "UNTRACKED", "CONSUMED"] as const,
      pricing_model: ["FIXED", "TIERED", "TIME_BASED"] as const,
    },
  },
} as const
