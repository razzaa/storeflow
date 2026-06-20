export type StoreTheme = {
  primary: string;
  name: string;
};

export type Store = {
  id: string;
  name: string;
  type: string;
  currency: string;
  theme_color: string;
  logo: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  store_id: string;
  name: string;
};

export type Product = {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  image: string | null;
  cost_price: number;
  selling_price: number;
  profit: number;
  margin: number;
  quantity: number;
  tax: number;
  discount: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

export type Bill = {
  id: string;
  store_id: string;
  customer_id: string | null;
  bill_number: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  payment_method: string;
  created_at: string;
};

export type BillItem = {
  id: string;
  bill_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  cost_price: number;
  profit: number;
};

export type CartItem = {
  product: Product;
  quantity: number;
  unit_price: number;
  discount: number;
};

export type InventoryLog = {
  id: string;
  product_id: string;
  change_type: 'add' | 'sell' | 'return' | 'damage' | 'adjust';
  quantity: number;
  reason: string | null;
  created_at: string;
};

export type PriceHistory = {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  old_margin: number;
  new_margin: number;
  changed_at: string;
  reason: string | null;
};

export type AppSettings = {
  id: string;
  active_store_id: string | null;
  app_name: string;
  is_onboarding_done: number;
  app_lock_enabled: number;
  pin_code: string | null;
  language: string;
  currency: string;
  skip_auth: number;
};

export type DashboardStats = {
  today_sales: number;
  today_profit: number;
  total_orders: number;
  low_stock_count: number;
  monthly_revenue: number;
};
