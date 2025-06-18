
import { supabase } from '@/integrations/supabase/client';
import type { TradeVehicle, TradeValuation, TradeAppraisalAppointment } from '@/types/trade';

export const getTradeVehiclesByLeadId = async (leadId: string): Promise<TradeVehicle[]> => {
  const { data, error } = await supabase
    .from('trade_vehicles')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trade vehicles:', error);
    throw error;
  }

  return (data || []).map(vehicle => ({
    id: vehicle.id,
    leadId: vehicle.lead_id,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    mileage: vehicle.mileage,
    condition: vehicle.condition as 'excellent' | 'very_good' | 'good' | 'fair' | 'poor',
    vin: vehicle.vin,
    exteriorColor: vehicle.exterior_color,
    interiorColor: vehicle.interior_color,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    fuelType: vehicle.fuel_type,
    accidentHistory: vehicle.accident_history,
    serviceRecords: vehicle.service_records,
    titleType: vehicle.title_type,
    liensOutstanding: vehicle.liens_outstanding,
    modifications: vehicle.modifications,
    additionalNotes: vehicle.additional_notes,
    photos: Array.isArray(vehicle.photos) ? vehicle.photos as string[] : [],
    createdAt: vehicle.created_at,
    updatedAt: vehicle.updated_at
  }));
};

export const createTradeVehicle = async (tradeVehicle: Omit<TradeVehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<TradeVehicle> => {
  const { data, error } = await supabase
    .from('trade_vehicles')
    .insert({
      lead_id: tradeVehicle.leadId,
      year: tradeVehicle.year,
      make: tradeVehicle.make,
      model: tradeVehicle.model,
      trim: tradeVehicle.trim,
      mileage: tradeVehicle.mileage,
      condition: tradeVehicle.condition,
      vin: tradeVehicle.vin,
      exterior_color: tradeVehicle.exteriorColor,
      interior_color: tradeVehicle.interiorColor,
      transmission: tradeVehicle.transmission,
      drivetrain: tradeVehicle.drivetrain,
      fuel_type: tradeVehicle.fuelType,
      accident_history: tradeVehicle.accidentHistory,
      service_records: tradeVehicle.serviceRecords,
      title_type: tradeVehicle.titleType,
      liens_outstanding: tradeVehicle.liensOutstanding,
      modifications: tradeVehicle.modifications,
      additional_notes: tradeVehicle.additionalNotes,
      photos: tradeVehicle.photos || []
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating trade vehicle:', error);
    throw error;
  }

  return {
    id: data.id,
    leadId: data.lead_id,
    year: data.year,
    make: data.make,
    model: data.model,
    trim: data.trim,
    mileage: data.mileage,
    condition: data.condition as 'excellent' | 'very_good' | 'good' | 'fair' | 'poor',
    vin: data.vin,
    exteriorColor: data.exterior_color,
    interiorColor: data.interior_color,
    transmission: data.transmission,
    drivetrain: data.drivetrain,
    fuelType: data.fuel_type,
    accidentHistory: data.accident_history,
    serviceRecords: data.service_records,
    titleType: data.title_type,
    liensOutstanding: data.liens_outstanding,
    modifications: data.modifications,
    additionalNotes: data.additional_notes,
    photos: Array.isArray(data.photos) ? data.photos as string[] : [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export const updateTradeVehicle = async (id: string, updates: Partial<TradeVehicle>): Promise<TradeVehicle> => {
  const { data, error } = await supabase
    .from('trade_vehicles')
    .update({
      year: updates.year,
      make: updates.make,
      model: updates.model,
      trim: updates.trim,
      mileage: updates.mileage,
      condition: updates.condition,
      vin: updates.vin,
      exterior_color: updates.exteriorColor,
      interior_color: updates.interiorColor,
      transmission: updates.transmission,
      drivetrain: updates.drivetrain,
      fuel_type: updates.fuelType,
      accident_history: updates.accidentHistory,
      service_records: updates.serviceRecords,
      title_type: updates.titleType,
      liens_outstanding: updates.liensOutstanding,
      modifications: updates.modifications,
      additional_notes: updates.additionalNotes,
      photos: updates.photos,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating trade vehicle:', error);
    throw error;
  }

  return {
    id: data.id,
    leadId: data.lead_id,
    year: data.year,
    make: data.make,
    model: data.model,
    trim: data.trim,
    mileage: data.mileage,
    condition: data.condition as 'excellent' | 'very_good' | 'good' | 'fair' | 'poor',
    vin: data.vin,
    exteriorColor: data.exterior_color,
    interiorColor: data.interior_color,
    transmission: data.transmission,
    drivetrain: data.drivetrain,
    fuelType: data.fuel_type,
    accidentHistory: data.accident_history,
    serviceRecords: data.service_records,
    titleType: data.title_type,
    liensOutstanding: data.liens_outstanding,
    modifications: data.modifications,
    additionalNotes: data.additional_notes,
    photos: Array.isArray(data.photos) ? data.photos as string[] : [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export const deleteTradeVehicle = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('trade_vehicles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting trade vehicle:', error);
    throw error;
  }
};

export const getTradeValuations = async (tradeVehicleId: string): Promise<TradeValuation[]> => {
  const { data, error } = await supabase
    .from('trade_valuations')
    .select('*')
    .eq('trade_vehicle_id', tradeVehicleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trade valuations:', error);
    throw error;
  }

  return (data || []).map(valuation => ({
    id: valuation.id,
    tradeVehicleId: valuation.trade_vehicle_id,
    valuationSource: valuation.valuation_source as 'kbb' | 'edmunds' | 'manual' | 'dealer_estimate',
    tradeInValue: valuation.trade_in_value,
    privatePartyValue: valuation.private_party_value,
    retailValue: valuation.retail_value,
    wholesaleValue: valuation.wholesale_value,
    estimatedValue: valuation.estimated_value,
    valuationDate: valuation.valuation_date,
    marketConditions: valuation.market_conditions,
    depreciationFactors: typeof valuation.depreciation_factors === 'object' && valuation.depreciation_factors !== null 
      ? valuation.depreciation_factors as Record<string, any> 
      : {},
    valuationNotes: valuation.valuation_notes,
    appraisedBy: valuation.appraised_by,
    isFinalOffer: valuation.is_final_offer,
    expiresAt: valuation.expires_at,
    createdAt: valuation.created_at
  }));
};

export const createTradeValuation = async (valuation: Omit<TradeValuation, 'id' | 'createdAt'>): Promise<TradeValuation> => {
  const { data, error } = await supabase
    .from('trade_valuations')
    .insert({
      trade_vehicle_id: valuation.tradeVehicleId,
      valuation_source: valuation.valuationSource,
      trade_in_value: valuation.tradeInValue,
      private_party_value: valuation.privatePartyValue,
      retail_value: valuation.retailValue,
      wholesale_value: valuation.wholesaleValue,
      estimated_value: valuation.estimatedValue,
      valuation_date: valuation.valuationDate,
      market_conditions: valuation.marketConditions,
      depreciation_factors: valuation.depreciationFactors,
      valuation_notes: valuation.valuationNotes,
      appraised_by: valuation.appraisedBy,
      is_final_offer: valuation.isFinalOffer,
      expires_at: valuation.expiresAt
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating trade valuation:', error);
    throw error;
  }

  return {
    id: data.id,
    tradeVehicleId: data.trade_vehicle_id,
    valuationSource: data.valuation_source as 'kbb' | 'edmunds' | 'manual' | 'dealer_estimate',
    tradeInValue: data.trade_in_value,
    privatePartyValue: data.private_party_value,
    retailValue: data.retail_value,
    wholesaleValue: data.wholesale_value,
    estimatedValue: data.estimated_value,
    valuationDate: data.valuation_date,
    marketConditions: data.market_conditions,
    depreciationFactors: typeof data.depreciation_factors === 'object' && data.depreciation_factors !== null 
      ? data.depreciation_factors as Record<string, any> 
      : {},
    valuationNotes: data.valuation_notes,
    appraisedBy: data.appraised_by,
    isFinalOffer: data.is_final_offer,
    expiresAt: data.expires_at,
    createdAt: data.created_at
  };
};

export const updateLeadTradeInfo = async (leadId: string, tradeInfo: {
  tradePayoffAmount?: number;
  tradeFinancingBank?: string;
  tradeDecisionTimeline?: string;
  tradeMotivation?: string;
}): Promise<void> => {
  const { error } = await supabase
    .from('leads')
    .update({
      trade_payoff_amount: tradeInfo.tradePayoffAmount,
      trade_financing_bank: tradeInfo.tradeFinancingBank,
      trade_decision_timeline: tradeInfo.tradeDecisionTimeline,
      trade_motivation: tradeInfo.tradeMotivation
    })
    .eq('id', leadId);

  if (error) {
    console.error('Error updating lead trade info:', error);
    throw error;
  }
};
