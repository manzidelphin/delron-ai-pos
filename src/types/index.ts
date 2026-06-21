// ═══════════════════════════════════════════
// DELRON AI POS — Core Type Definitions
// Matches schema: supabase/schema.sql
// ═══════════════════════════════════════════

export type UserRole =
  | "owner"
  | "manager"
  | "cashier"
  | "baker"
  | "waiter"
  | "bartender";

export type BusinessModule =
  | "supermarket"
  | "bakery"
  | "bar"
  | "restaurant";

export type PaymentMethod =
  | "cash"
  | "mtn_momo"
  | "airtel_money"
  | "bank_transfer"
  | "credit"
  | "split";

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type OrderType = "counter" | "table" | "takeaway" | "credit" | "bar_tab";

export type TableStatus = "empty" | "occupied" | "bill_requested" | "reserved";

export type CreditStatus = "unpaid" | "partial" | "paid" | "overdue";

export type BarcodeType = "pre-packaged" | "generic";

export type NotificationType = "info" | "warning" | "alert" | "success";

export type NotificationCategory =
  | "stock"
  | "credit"
  | "sales"
  | "production"
  | "staff"
  | "system";

// ───────────────────────────────────────────
// DATABASE ENTITY TYPES
// ───────────────────────────────────────────

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  modules: BusinessModule[];
  plan: "free" | "starter" | "professional" | "enterprise";
  language: "en" | "rw";
  currency: "RWF";
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  location: string | null;
  phone: string | null;
  is_main: boolean;
  created_at: string;
}

/** Staff member — linked to auth.users via user_id */
export interface Staff {
  id: string;
  business_id: string;
  branch_id: string | null;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  pin: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  business_id: string;
  branch_id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  price: number;
  cost_price: number;
  stock_type: "supermarket" | "bar";
  quantity: number;
  min_quantity: number;
  unit: string;
  expiry_date: string | null;
  supplier_id: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawMaterial {
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
  updated_at: string;
}

export interface FinishedGood {
  id: string;
  business_id: string;
  branch_id: string;
  name: string;
  barcode: string | null;
  barcode_type: BarcodeType;
  selling_price: number;
  cost_price: number;
  quantity: number;
  unit: string;
  category: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  business_id: string;
  finished_good_id: string;
  name: string;
  yield_quantity: number;
  yield_unit: string;
  instructions: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  raw_material_id: string;
  quantity_needed: number;
  unit: string;
}

export interface ProductionLog {
  id: string;
  business_id: string;
  branch_id: string;
  baker_id: string | null;
  finished_good_id: string;
  quantity_produced: number;
  batch_label: string | null;
  production_time: string;
  expiry_time: string | null;
  notes: string | null;
  created_at: string;
}

export interface WasteLog {
  id: string;
  business_id: string;
  branch_id: string;
  item_id: string;
  item_type: "product" | "finished_good" | "raw_material";
  item_name: string;
  quantity_wasted: number;
  reason: string | null;
  cost_of_waste: number;
  logged_by: string | null;
  date: string;
  created_at: string;
}

export interface BarItem {
  id: string;
  business_id: string;
  branch_id: string;
  name: string;
  barcode: string | null;
  category: string;
  price_per_bottle: number;
  price_per_shot: number | null;
  shots_per_bottle: number | null;
  quantity_bottles: number;
  shots_remaining: number;
  cost_per_bottle: number;
  reorder_point: number;
  min_quantity: number;
  supplier_id: string | null;
  is_shot_item: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FloorTable {
  id: string;
  business_id: string;
  branch_id: string;
  table_number: number;
  capacity: number;
  location: string | null;
  section: string | null;
  status: TableStatus;
  current_order_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  business_id: string;
  branch_id: string;
  table_id: string | null;
  staff_id: string | null;
  order_type: OrderType;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  item_type: "product" | "finished_good" | "bar_item" | "custom";
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  branch_id: string;
  order_id: string | null;
  cashier_id: string | null;
  total: number;
  payment_method: string;
  receipt_number: string | null;
  ebm_number: string | null;
  module_source: BusinessModule | null;
  created_at: string;
}

export interface Credit {
  id: string;
  business_id: string;
  branch_id: string;
  order_id: string | null;
  customer_name: string;
  customer_phone: string;
  items_description: string | null;
  total_amount: number;
  amount_paid: number;
  balance: number;
  due_date: string;
  status: CreditStatus;
  created_by: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory | null;
  sent_via: string[];
  is_read: boolean;
  created_at: string;
}

export interface AIConversation {
  id: string;
  business_id: string;
  user_id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
}

// ───────────────────────────────────────────
// UI / APPLICATION TYPES
// ───────────────────────────────────────────

export interface CartItem {
  product_id: string;
  product_type: "product" | "finished_good" | "bar_item";
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit?: string;
  notes?: string;
  is_generic?: boolean;
  meta?: Record<string, unknown>;
}

export interface DashboardStats {
  revenue_today: number;
  revenue_yesterday: number;
  revenue_week: number;
  revenue_month: number;
  transactions_today: number;
  outstanding_credits: number;
  low_stock_count: number;
  active_staff: number;
  revenue_by_module: {
    supermarket: number;
    bakery: number;
    bar: number;
    restaurant: number;
  };
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface OnboardingData {
  full_name: string;
  business_name: string;
  phone: string;
  email: string;
  location: string;
  password: string;
  modules: BusinessModule[];
  branch_count: number;
  staff_count: number;
  language: "en" | "rw";
  products_method: "scan" | "excel" | "manual" | "skip";
}

export interface LowStockAlert {
  item_id: string;
  item_name: string;
  current_quantity: number;
  min_quantity: number;
  module: BusinessModule | "bakery_raw";
}

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: string;
  module?: BusinessModule;
  roles: UserRole[];
  badge?: number;
}
