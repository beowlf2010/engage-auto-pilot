
export interface InventoryItem {
  id: string;
  vin: string;
  stock_number?: string;
  year?: number;
  make: string;
  model: string;
  trim?: string;
  body_style?: string;
  exterior_color?: string;
  interior_color?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuel_type?: string;
  mileage?: number;
  price?: number;
  msrp?: number;
  invoice?: number;
  rebates?: number;
  pack?: number;
  condition: 'new' | 'used' | 'certified';
  status: 'available' | 'sold' | 'pending' | 'service' | 'wholesale';
  source_report?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'website_scrape';
  rpo_codes?: string[];
  rpo_descriptions?: string[];
  full_option_blob?: any;
  first_seen_at?: string;
  last_seen_at?: string;
  sold_at?: string;
  days_in_inventory?: number;
  leads_count?: number;
  features?: string[];
  description?: string;
  dealer_notes?: string;
  images?: string[];
  carfax_url?: string;
  location?: string;
  upload_history_id?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  
  // GM Global and delivery-related properties
  gm_order_number?: string;
  customer_name?: string;
  actual_delivery_date?: string;
  estimated_delivery_date?: string;
  delivery_variance_days?: number;
  
  // Extended properties for dashboard
  deals?: any[];
  deal_count?: number;
  latest_deal?: any;
  data_completeness?: number;
}

export interface InventoryFilters {
  make?: string;
  model?: string;
  status?: string;
  inventoryType?: 'new' | 'used' | 'all';
  sourceReport?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'website_scrape';
  rpoCode?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  sortBy?: 'age' | 'price' | 'year' | 'make' | 'model' | 'completeness';
  sortOrder?: 'asc' | 'desc';
  dataQuality?: 'all' | 'complete' | 'incomplete';
}
