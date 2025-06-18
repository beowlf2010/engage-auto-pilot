
export interface TradeVehicle {
  id: string;
  leadId: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  mileage?: number;
  condition?: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor';
  vin?: string;
  exteriorColor?: string;
  interiorColor?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  accidentHistory?: boolean;
  serviceRecords?: boolean;
  titleType?: string;
  liensOutstanding?: boolean;
  modifications?: string;
  additionalNotes?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeValuation {
  id: string;
  tradeVehicleId: string;
  valuationSource: 'kbb' | 'edmunds' | 'manual' | 'dealer_estimate';
  tradeInValue?: number;
  privatePartyValue?: number;
  retailValue?: number;
  wholesaleValue?: number;
  estimatedValue?: number;
  valuationDate: string;
  marketConditions?: string;
  depreciationFactors?: Record<string, any>;
  valuationNotes?: string;
  appraisedBy?: string;
  isFinalOffer?: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface TradeAppraisalAppointment {
  id: string;
  tradeVehicleId: string;
  appointmentId?: string;
  appraisalType: 'in_person' | 'virtual' | 'photos_only';
  appraisalStatus: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  appraiserId?: string;
  estimatedDuration?: number;
  specialInstructions?: string;
  completedAt?: string;
  appraisalResult?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TradeLeadData {
  hasTradeVehicle?: boolean;
  tradePayoffAmount?: number;
  tradeFinancingBank?: string;
  tradeDecisionTimeline?: 'immediate' | 'within_week' | 'within_month' | 'researching';
  tradeMotivation?: 'upgrade' | 'downsize' | 'different_style' | 'financial' | 'reliability';
}
