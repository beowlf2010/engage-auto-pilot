
import { supabase } from '@/integrations/supabase/client';

export interface TradeDetection {
  hasTradeIntent: boolean;
  confidence: number;
  detectedVehicleInfo: {
    year?: number;
    make?: string;
    model?: string;
    mileage?: number;
  };
  tradeKeywords: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
}

// Analyze message content for trade vehicle mentions
export const analyzeTradeIntent = (messageContent: string): TradeDetection => {
  const message = messageContent.toLowerCase();
  
  // Trade intent patterns with confidence scoring
  const tradePatterns = [
    { pattern: /\b(trade\s*in|trading\s*in|trade\s*my|current\s*car|my\s*car)\b/, confidence: 0.9, keywords: ['trade-in'] },
    { pattern: /\b(sell\s*my|get\s*rid\s*of|replace\s*my)\b/, confidence: 0.7, keywords: ['sell current'] },
    { pattern: /\b(payoff|owe\s*on|financing|loan)\b/, confidence: 0.6, keywords: ['financing'] },
    { pattern: /\b(worth|value|estimate|appraisal)\b/, confidence: 0.8, keywords: ['valuation'] },
    { pattern: /\b(upgrade|downsize|different\s*car)\b/, confidence: 0.7, keywords: ['change vehicle'] }
  ];

  let maxConfidence = 0;
  const detectedKeywords: string[] = [];
  
  // Check for trade patterns
  for (const { pattern, confidence, keywords } of tradePatterns) {
    if (pattern.test(message)) {
      maxConfidence = Math.max(maxConfidence, confidence);
      detectedKeywords.push(...keywords);
    }
  }

  // Extract vehicle information
  const vehicleInfo = extractVehicleInfo(message);
  
  // Determine urgency based on urgency keywords
  let urgencyLevel: 'low' | 'medium' | 'high' = 'medium';
  if (/\b(urgent|asap|need\s*to\s*sell|immediately)\b/.test(message)) {
    urgencyLevel = 'high';
  } else if (/\b(eventually|someday|thinking\s*about|considering)\b/.test(message)) {
    urgencyLevel = 'low';
  }

  // Boost confidence if vehicle details are mentioned
  if (Object.keys(vehicleInfo).length > 0) {
    maxConfidence = Math.min(1.0, maxConfidence + 0.2);
  }

  return {
    hasTradeIntent: maxConfidence >= 0.6,
    confidence: maxConfidence,
    detectedVehicleInfo: vehicleInfo,
    tradeKeywords: detectedKeywords,
    urgencyLevel
  };
};

// Extract vehicle information from message text
const extractVehicleInfo = (message: string) => {
  const vehicleInfo: any = {};
  
  // Extract year (look for 4-digit numbers that could be years)
  const yearMatch = message.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    if (year >= 1990 && year <= new Date().getFullYear() + 1) {
      vehicleInfo.year = year;
    }
  }

  // Common car makes
  const makes = [
    'toyota', 'honda', 'ford', 'chevrolet', 'chevy', 'nissan', 'hyundai', 'kia',
    'mazda', 'subaru', 'volkswagen', 'vw', 'bmw', 'mercedes', 'audi', 'lexus',
    'acura', 'infiniti', 'cadillac', 'buick', 'gmc', 'jeep', 'dodge', 'ram',
    'chrysler', 'mitsubishi', 'volvo', 'land rover', 'jaguar', 'tesla'
  ];
  
  for (const make of makes) {
    if (message.includes(make)) {
      vehicleInfo.make = make.charAt(0).toUpperCase() + make.slice(1);
      break;
    }
  }

  // Extract mileage
  const mileageMatch = message.match(/\b(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi|k)\b/);
  if (mileageMatch) {
    const mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
    if (mileage > 0 && mileage < 500000) {
      vehicleInfo.mileage = mileage;
    }
  }

  return vehicleInfo;
};

// Log trade detection for analytics
export const logTradeDetection = async (leadId: string, detection: TradeDetection, messageId: string) => {
  try {
    await supabase
      .from('lead_behavior_triggers')
      .insert({
        lead_id: leadId,
        trigger_type: 'trade_interest',
        trigger_data: {
          confidence: detection.confidence,
          detectedVehicleInfo: detection.detectedVehicleInfo,
          tradeKeywords: detection.tradeKeywords,
          urgencyLevel: detection.urgencyLevel,
          messageId: messageId,
          detectedAt: new Date().toISOString()
        },
        is_processed: false
      });
  } catch (error) {
    console.error('Error logging trade detection:', error);
  }
};
