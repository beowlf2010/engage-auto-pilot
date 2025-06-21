
import { VehicleMention } from '../vehicleMention/types';
import { extractVehicleFromText } from '../vehicleMention/vehicleExtraction';

export interface VehicleFeatureInterest {
  feature: string;
  importance: 'high' | 'medium' | 'low';
  context: string;
  confidence: number;
}

export interface EnhancedVehicleInterest {
  primaryVehicle: string;
  specificFeatures: VehicleFeatureInterest[];
  useCase: 'work' | 'personal' | 'family' | 'unknown';
  budgetSignals: string[];
  timelineSignals: string[];
  confidence: number;
}

export const analyzeVehicleInterest = (conversationHistory: string, latestMessage: string): EnhancedVehicleInterest => {
  const fullText = `${conversationHistory} ${latestMessage}`.toLowerCase();
  
  // Extract primary vehicle mentions
  const vehicleMentions = extractVehicleFromText(fullText);
  const primaryVehicle = vehicleMentions.length > 0 ? 
    `${vehicleMentions[0].year || ''} ${vehicleMentions[0].make || ''} ${vehicleMentions[0].model || ''}`.trim() : 
    'unknown';

  // Detect specific features
  const featurePatterns = {
    'SRW': /\b(srw|single rear wheel)\b/i,
    'DRW': /\b(drw|dual rear wheel|dually)\b/i,
    'Towing': /\b(tow|pull|haul|trailer|hitch)\b/i,
    'Payload': /\b(payload|carry|load|bed)\b/i,
    'Diesel': /\b(diesel|power stroke|duramax)\b/i,
    'Gas': /\b(gas|gasoline|v8|v6)\b/i,
    '4WD': /\b(4wd|four wheel drive|awd|all wheel)\b/i,
    'Crew Cab': /\b(crew cab|4 door|four door)\b/i,
    'Extended Cab': /\b(extended cab|super cab|double cab)\b/i
  };

  const specificFeatures: VehicleFeatureInterest[] = [];
  
  for (const [feature, pattern] of Object.entries(featurePatterns)) {
    if (pattern.test(fullText)) {
      const context = extractFeatureContext(fullText, feature);
      const importance = determineFeatureImportance(feature, context);
      specificFeatures.push({
        feature,
        importance,
        context,
        confidence: 0.8
      });
    }
  }

  // Determine use case
  const useCase = determineUseCase(fullText);
  
  // Extract budget and timeline signals
  const budgetSignals = extractBudgetSignals(fullText);
  const timelineSignals = extractTimelineSignals(fullText);

  return {
    primaryVehicle,
    specificFeatures,
    useCase,
    budgetSignals,
    timelineSignals,
    confidence: Math.min(vehicleMentions.length > 0 ? 0.9 : 0.3, specificFeatures.length * 0.2 + 0.5)
  };
};

const extractFeatureContext = (text: string, feature: string): string => {
  const sentences = text.split(/[.!?]+/);
  const relevantSentence = sentences.find(s => 
    s.toLowerCase().includes(feature.toLowerCase())
  );
  return relevantSentence?.trim() || '';
};

const determineFeatureImportance = (feature: string, context: string): 'high' | 'medium' | 'low' => {
  const highImportanceWords = ['need', 'must', 'require', 'essential', 'important'];
  const lowImportanceWords = ['nice', 'prefer', 'maybe', 'consider'];
  
  const contextLower = context.toLowerCase();
  
  if (highImportanceWords.some(word => contextLower.includes(word))) {
    return 'high';
  }
  if (lowImportanceWords.some(word => contextLower.includes(word))) {
    return 'low';
  }
  return 'medium';
};

const determineUseCase = (text: string): 'work' | 'personal' | 'family' | 'unknown' => {
  const workPatterns = /\b(work|job|business|contractor|construction|farm|ranch)\b/i;
  const familyPatterns = /\b(family|kids|children|wife|husband|spouse)\b/i;
  const personalPatterns = /\b(personal|myself|weekend|hobby|recreation)\b/i;
  
  if (workPatterns.test(text)) return 'work';
  if (familyPatterns.test(text)) return 'family';
  if (personalPatterns.test(text)) return 'personal';
  return 'unknown';
};

const extractBudgetSignals = (text: string): string[] => {
  const budgetPatterns = [
    /\$[\d,]+/g,
    /\b(budget|afford|payment|finance|lease|cash)\b/gi,
    /\b(monthly|down payment|trade)\b/gi
  ];
  
  const signals: string[] = [];
  budgetPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      signals.push(...matches);
    }
  });
  
  return [...new Set(signals)];
};

const extractTimelineSignals = (text: string): string[] => {
  const timelinePatterns = [
    /\b(asap|urgent|soon|today|tomorrow|this week|next week)\b/gi,
    /\b(no rush|sometime|eventually|thinking about)\b/gi,
    /\b(need by|deadline|timeline)\b/gi
  ];
  
  const signals: string[] = [];
  timelinePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      signals.push(...matches);
    }
  });
  
  return [...new Set(signals)];
};
