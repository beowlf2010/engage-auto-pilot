
import { supabase } from '@/integrations/supabase/client';

// Patterns that indicate pricing content
const PRICING_PATTERNS = [
  /\$[\d,]+/g, // Dollar amounts like $25,000
  /\b\d+[,.]?\d*\s*(dollars?|bucks?)\b/gi, // Written dollar amounts
  /\b(price|cost|payment|financing|lease|msrp|value|trade)\b/gi, // Pricing keywords
  /\b\d+[,.]?\d*\s*k\b/gi, // Amounts like 25k
  /\b(down|monthly|weekly|apr|interest)\b/gi, // Financial terms
];

const PRICING_KEYWORDS = [
  'price', 'cost', 'payment', 'financing', 'lease', 'msrp', 'value', 'trade',
  'down', 'monthly', 'weekly', 'apr', 'interest', 'credit', 'loan', 'finance'
];

export const detectsPricing = (text: string): boolean => {
  // Check for dollar signs and numbers
  if (/\$[\d,]+/.test(text)) return true;
  
  // Check for pricing patterns
  return PRICING_PATTERNS.some(pattern => pattern.test(text));
};

export const getApplicableDisclaimers = async (messageText: string, context: {
  isInventoryRelated?: boolean;
  mentionsTradeIn?: boolean;
  mentionsFinancing?: boolean;
  mentionsLease?: boolean;
} = {}) => {
  try {
    const { data: disclaimers, error } = await supabase
      .from('pricing_disclaimers')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const applicableDisclaimers = [];
    const lowerText = messageText.toLowerCase();

    // Always include general disclaimer if pricing is detected
    if (detectsPricing(messageText)) {
      const generalDisclaimer = disclaimers.find(d => d.disclaimer_type === 'general');
      if (generalDisclaimer) applicableDisclaimers.push(generalDisclaimer);
    }

    // Add specific disclaimers based on context
    if (context.mentionsTradeIn || lowerText.includes('trade')) {
      const tradeDisclaimer = disclaimers.find(d => d.disclaimer_type === 'trade_value');
      if (tradeDisclaimer) applicableDisclaimers.push(tradeDisclaimer);
    }

    if (context.mentionsFinancing || lowerText.includes('financ') || lowerText.includes('apr')) {
      const financeDisclaimer = disclaimers.find(d => d.disclaimer_type === 'financing');
      if (financeDisclaimer) applicableDisclaimers.push(financeDisclaimer);
    }

    if (context.mentionsLease || lowerText.includes('lease')) {
      const leaseDisclaimer = disclaimers.find(d => d.disclaimer_type === 'lease');
      if (leaseDisclaimer) applicableDisclaimers.push(leaseDisclaimer);
    }

    if (context.isInventoryRelated || lowerText.includes('internet')) {
      const internetDisclaimer = disclaimers.find(d => d.disclaimer_type === 'internet_price');
      if (internetDisclaimer) applicableDisclaimers.push(internetDisclaimer);
    }

    return applicableDisclaimers;
  } catch (error) {
    console.error('Error fetching disclaimers:', error);
    return [];
  }
};

export const addDisclaimersToMessage = async (message: string, context: {
  isInventoryRelated?: boolean;
  mentionsTradeIn?: boolean;
  mentionsFinancing?: boolean;
  mentionsLease?: boolean;
} = {}): Promise<string> => {
  if (!detectsPricing(message)) {
    return message;
  }

  const disclaimers = await getApplicableDisclaimers(message, context);
  
  if (disclaimers.length === 0) {
    return message;
  }

  // Add disclaimers to the end of the message
  const disclaimerTexts = disclaimers.map(d => d.disclaimer_text);
  const uniqueDisclaimers = [...new Set(disclaimerTexts)]; // Remove duplicates
  
  return `${message}\n\n${uniqueDisclaimers.join(' ')}`;
};

export const validateMessageForCompliance = (message: string): {
  hasPrice: boolean;
  hasDisclaimer: boolean;
  isCompliant: boolean;
  warnings: string[];
} => {
  const hasPrice = detectsPricing(message);
  
  // Check if message already contains disclaimer keywords
  const disclaimerKeywords = ['tax', 'title', 'license', 'dealer fees', 'see dealer', 'subject to', 'approval'];
  const hasDisclaimer = disclaimerKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );

  const warnings = [];
  
  if (hasPrice && !hasDisclaimer) {
    warnings.push('Message contains pricing but no disclaimer detected');
  }

  return {
    hasPrice,
    hasDisclaimer,
    isCompliant: !hasPrice || hasDisclaimer,
    warnings
  };
};
