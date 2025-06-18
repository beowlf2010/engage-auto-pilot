
export interface InventoryItem {
  id: string;
  vin: string;
  stock_number?: string;
  year?: number;
  make: string;
  model: string;
  trim?: string;
  body_style?: string;
  color_exterior?: string;
  color_interior?: string;
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
  created_at: string;
  updated_at: string;
}

export interface InventoryFilters {
  make?: string;
  model?: string;
  status?: string;
  sourceReport?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'website_scrape';
  rpoCode?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
}
