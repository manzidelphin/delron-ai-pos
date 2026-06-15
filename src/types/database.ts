// Auto-generated Supabase database types for DELRON AI POS
// Run `npx supabase gen types typescript` after connecting to your project to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          location: string;
          phone: string;
          email: string;
          modules: string[];
          plan: string;
          currency: string;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          location: string;
          phone: string;
          email: string;
          modules?: string[];
          plan?: string;
          currency?: string;
          language?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
      };
      branches: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          location: string;
          phone: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          location: string;
          phone: string;
        };
        Update: Partial<Database["public"]["Tables"]["branches"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          name: string;
          phone: string;
          email: string | null;
          role: string;
          pin: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          name: string;
          phone: string;
          email?: string | null;
          role: string;
          pin?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          name: string;
          barcode: string;
          category: string;
          subcategory: string | null;
          price: number;
          cost_price: number;
          stock_type: string;
          quantity: number;
          min_quantity: number;
          expiry_date: string | null;
          supplier_id: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          name: string;
          barcode: string;
          category: string;
          subcategory?: string | null;
          price: number;
          cost_price?: number;
          stock_type?: string;
          quantity?: number;
          min_quantity?: number;
          expiry_date?: string | null;
          supplier_id?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      raw_materials: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          name: string;
          unit: string;
          quantity: number;
          min_quantity: number;
          cost_per_unit: number;
          supplier_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          name: string;
          unit: string;
          quantity?: number;
          min_quantity?: number;
          cost_per_unit?: number;
          supplier_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["raw_materials"]["Insert"]>;
      };
      recipes: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          finished_product_id: string;
          yield_quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          finished_product_id: string;
          yield_quantity?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          raw_material_id: string;
          quantity_needed: number;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          raw_material_id: string;
          quantity_needed: number;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_ingredients"]["Insert"]>;
      };
      finished_goods: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          name: string;
          barcode: string;
          barcode_type: string;
          selling_price: number;
          cost_price: number;
          quantity: number;
          production_date: string | null;
          expiry_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          name: string;
          barcode: string;
          barcode_type?: string;
          selling_price: number;
          cost_price?: number;
          quantity?: number;
          production_date?: string | null;
          expiry_date?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["finished_goods"]["Insert"]>;
      };
      production_logs: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          baker_id: string;
          finished_good_id: string;
          quantity_produced: number;
          batch_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          baker_id: string;
          finished_good_id: string;
          quantity_produced: number;
          batch_time?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["production_logs"]["Insert"]>;
      };
      waste_logs: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          item_id: string;
          item_type: string;
          quantity_wasted: number;
          reason: string | null;
          date: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          item_id: string;
          item_type: string;
          quantity_wasted: number;
          reason?: string | null;
          date?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waste_logs"]["Insert"]>;
      };
      bar_items: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          name: string;
          barcode: string;
          category: string;
          price_per_bottle: number;
          price_per_shot: number | null;
          shots_per_bottle: number | null;
          quantity_bottles: number;
          shots_remaining: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          name: string;
          barcode: string;
          category: string;
          price_per_bottle: number;
          price_per_shot?: number | null;
          shots_per_bottle?: number | null;
          quantity_bottles?: number;
          shots_remaining?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bar_items"]["Insert"]>;
      };
      tables: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          table_number: number;
          capacity: number;
          status: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          table_number: number;
          capacity?: number;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tables"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          table_id: string | null;
          waiter_id: string | null;
          status: string;
          total_amount: number;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          table_id?: string | null;
          waiter_id?: string | null;
          status?: string;
          total_amount?: number;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_type: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_type: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          cashier_id: string;
          order_id: string | null;
          total: number;
          payment_method: string;
          receipt_number: string;
          ebm_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          cashier_id: string;
          order_id?: string | null;
          total: number;
          payment_method: string;
          receipt_number: string;
          ebm_number?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
      credits: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          customer_name: string;
          customer_phone: string;
          items_description: string;
          total_amount: number;
          amount_paid: number;
          due_date: string;
          status: string;
          created_by: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          customer_name: string;
          customer_phone: string;
          items_description: string;
          total_amount: number;
          amount_paid?: number;
          due_date: string;
          status?: string;
          created_by: string;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["credits"]["Insert"]>;
      };
      suppliers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone: string;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          type: string;
          message: string;
          sent_via: string;
          sent_at: string;
          read: boolean;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          type: string;
          message: string;
          sent_via: string;
          sent_at?: string;
          read?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      ai_conversations: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role: string;
          message: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_conversations"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
