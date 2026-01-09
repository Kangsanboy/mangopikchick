export interface PreorderData {
  id: string;
  customer_name: string;
  quantity: number;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseData {
  id: string;
  quantity: number;
  weight: number;
  price_per_kg: number;
  total_price: number;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface SaleData {
  id: string;
  customer_name: string;
  quantity: number;
  weight: number;
  price_per_kg: number;
  total_price: number;
  date: string;
  created_at?: string;
  updated_at?: string;
}

// Database table names
export const TABLE_NAMES = {
  PREORDERS: 'preorders_2026_01_09_07_00',
  PURCHASES: 'purchases_2026_01_09_07_00',
  SALES: 'sales_2026_01_09_07_00',
} as const;