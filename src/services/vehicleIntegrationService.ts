
import { supabase } from "@/integrations/supabase/client";

export interface VehicleWithDeals {
  id: string;
  vin?: string;
  stock_number?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  body_style?: string;
  price?: number;
  status: string;
  condition: string;
  mileage?: number;
  color_exterior?: string;
  color_interior?: string;
  engine?: string;
  transmission?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  sold_at?: string;
  days_in_inventory?: number;
  source_report?: string;
  deals: Array<{
    id: string;
    upload_date: string;
    sale_amount?: number;
    gross_profit?: number;
    total_profit?: number;
    deal_type?: string;
    buyer_name?: string;
  }>;
  leads_count: number;
}

export interface DealWithVehicle {
  id: string;
  stock_number?: string;
  upload_date: string;
  sale_amount?: number;
  gross_profit?: number;
  total_profit?: number;
  deal_type?: string;
  buyer_name?: string;
  vehicle?: {
    id: string;
    vin?: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    price?: number;
    status: string;
    condition: string;
  };
}

export const getVehicleWithDeals = async (identifier: string): Promise<VehicleWithDeals | null> => {
  // First get the vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('inventory')
    .select('*')
    .or(`stock_number.eq.${identifier},vin.eq.${identifier}`)
    .single();

  if (vehicleError || !vehicle) {
    return null;
  }

  // Then get all deals for this vehicle
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id, upload_date, sale_amount, gross_profit, total_profit, deal_type, buyer_name')
    .eq('stock_number', vehicle.stock_number || identifier)
    .order('upload_date', { ascending: false });

  return {
    id: vehicle.id,
    vin: vehicle.vin,
    stock_number: vehicle.stock_number,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    body_style: vehicle.body_style,
    price: vehicle.price,
    status: vehicle.status,
    condition: vehicle.condition,
    mileage: vehicle.mileage,
    color_exterior: vehicle.color_exterior,
    color_interior: vehicle.color_interior,
    engine: vehicle.engine,
    transmission: vehicle.transmission,
    first_seen_at: vehicle.first_seen_at,
    last_seen_at: vehicle.last_seen_at,
    sold_at: vehicle.sold_at,
    days_in_inventory: vehicle.days_in_inventory,
    source_report: vehicle.source_report,
    deals: deals || [],
    leads_count: vehicle.leads_count || 0
  };
};

export const getDealWithVehicle = async (dealId: string): Promise<DealWithVehicle | null> => {
  // First get the deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .single();

  if (dealError || !deal) {
    return null;
  }

  // Then get the vehicle if stock number exists
  let vehicle = null;
  if (deal.stock_number) {
    const { data: vehicleData } = await supabase
      .from('inventory')
      .select('id, vin, year, make, model, trim, price, status, condition')
      .eq('stock_number', deal.stock_number)
      .single();
    
    vehicle = vehicleData;
  }

  return {
    id: deal.id,
    stock_number: deal.stock_number,
    upload_date: deal.upload_date,
    sale_amount: deal.sale_amount,
    gross_profit: deal.gross_profit,
    total_profit: deal.total_profit,
    deal_type: deal.deal_type,
    buyer_name: deal.buyer_name,
    vehicle
  };
};

export const searchVehiclesAndDeals = async (searchTerm: string) => {
  const [vehiclesResult, dealsResult] = await Promise.all([
    supabase
      .from('inventory')
      .select('id, vin, stock_number, year, make, model, status, condition')
      .or(`stock_number.ilike.%${searchTerm}%,vin.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`)
      .limit(10),
    supabase
      .from('deals')
      .select('id, stock_number, buyer_name, upload_date, sale_amount')
      .or(`stock_number.ilike.%${searchTerm}%,buyer_name.ilike.%${searchTerm}%`)
      .limit(10)
  ]);

  return {
    vehicles: vehiclesResult.data || [],
    deals: dealsResult.data || []
  };
};
