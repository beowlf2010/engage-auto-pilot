
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

  return data || [];
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

  return data;
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

  return data;
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

  return data || [];
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

  return data;
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
