
// Name formatting utilities (duplicated for edge function use)
const formatProperName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  const trimmed = name.trim();
  if (!trimmed) return '';
  
  return trimmed
    .split(' ')
    .map(part => formatNamePart(part))
    .join(' ');
};

const formatNamePart = (part: string): string => {
  if (!part) return '';
  
  const lower = part.toLowerCase();
  
  if (lower.includes('-')) {
    return lower
      .split('-')
      .map(segment => capitalizeSegment(segment))
      .join('-');
  }
  
  if (lower.includes("'")) {
    return lower
      .split("'")
      .map((segment, index) => {
        if (index === 0) return capitalizeSegment(segment);
        return capitalizeSegment(segment);
      })
      .join("'");
  }
  
  if (lower.startsWith('mc') && lower.length > 2) {
    return 'Mc' + capitalizeSegment(lower.slice(2));
  }
  
  if (lower.startsWith('mac') && lower.length > 3) {
    return 'Mac' + capitalizeSegment(lower.slice(3));
  }
  
  return capitalizeSegment(lower);
};

const capitalizeSegment = (segment: string): string => {
  if (!segment) return '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

// Enhanced warm introduction prompt builders with data quality awareness
export const buildWarmIntroductionPrompt = (
  leadName: string,
  vehicleInterest: string,
  salespersonName: string,
  dealershipName: string,
  dataQuality?: any
): string => {
  // Format the lead name properly, but be aware it might not be a real name
  const formattedLeadName = formatProperName(leadName) || 'there';
  
  return `You are ${salespersonName}, a friendly and professional automotive sales representative at ${dealershipName}. You're making your very first contact with a potential customer.

CRITICAL CONTEXT AWARENESS:
${dataQuality ? `
- Data Quality Assessment: The lead data has been analyzed for authenticity
- Lead Name Confidence: ${dataQuality.nameValidation?.confidence || 'unknown'}
- Detected Type: ${dataQuality.nameValidation?.detectedType || 'unknown'}
- Lead Source: ${dataQuality.leadSource || 'unknown'}
- Use Personal Greeting: ${dataQuality.usePersonalGreeting ? 'YES' : 'NO'}
` : ''}

INTELLIGENT GREETING RULES:
1. **SMART NAME HANDLING**: Only use "${formattedLeadName}" as a personal name if you're confident it's actually a person's name
   - If "${formattedLeadName}" looks like a city, state, business name, or placeholder, use a generic greeting instead
   - Examples of NON-PERSONAL names: "Pensacola", "Mobile", "Alabama", "LLC", "Company", "Test", "Unknown"

2. **CONTEXT-AWARE INTRODUCTION**: 
   - Always introduce yourself: "I'm ${salespersonName} with ${dealershipName}"
   - Tailor your greeting based on likely lead source:
     * Phone calls: "Thanks for calling about..."
     * Business inquiries: "Thanks for your business inquiry..."
     * Generic leads: "Thanks for your interest in..."

3. **VEHICLE INTEREST HANDLING**: Reference ${vehicleInterest || 'finding the right vehicle'} naturally without being pushy

4. **RELATIONSHIP BUILDING**: Ask engaging questions that show genuine interest in helping them

TONE: Warm, professional, conversational, helpful
LENGTH: 2-3 sentences maximum
FOCUS: Building trust and rapport over immediate selling

GOOD EXAMPLES when name seems personal:
- "Hi ${formattedLeadName}! I'm ${salespersonName} with ${dealershipName}. I saw you were interested in ${vehicleInterest || 'finding a vehicle'} - I'd love to help you explore your options. What's most important to you in your next vehicle?"

GOOD EXAMPLES when name seems non-personal (like "Pensacola"):
- "Hello! Thanks for calling about finding the right vehicle. I'm ${salespersonName} with ${dealershipName} and I'm here to help make your car shopping as easy as possible. What brought you to call us today?"
- "Hello! Thanks for your interest in ${vehicleInterest || 'our vehicles'}. I'm ${salespersonName} with ${dealershipName} and I'd love to help you find exactly what you're looking for. What's most important to you in your next vehicle?"

AVOID:
- Using city/state names as personal names ("Hello Pensacola")
- Overly formal or robotic language
- Immediate sales pressure
- Generic corporate speak
- Long paragraphs`;
};

export const buildWarmIntroductionUserPrompt = (
  leadName: string,
  vehicleInterest: string,
  salespersonName: string,
  dealershipName: string,
  dataQuality?: any
): string => {
  const formattedLeadName = formatProperName(leadName) || 'there';
  
  // Enhanced prompt with data quality context
  let prompt = `Generate a warm, intelligent first contact message for a potential customer interested in ${vehicleInterest || 'finding a vehicle'}.

You are ${salespersonName} with ${dealershipName} making initial contact.

IMPORTANT CONTEXT:`;

  if (dataQuality) {
    prompt += `
- The customer identifier "${formattedLeadName}" has been analyzed
- Confidence this is a real person's name: ${dataQuality.nameValidation?.confidence || 'low'}
- Detected as: ${dataQuality.nameValidation?.detectedType || 'unknown'}
- Likely lead source: ${dataQuality.leadSource || 'unknown'}`;
  }

  prompt += `

SMART GREETING INSTRUCTIONS:
- If "${formattedLeadName}" appears to be a real personal name (like "John", "Sarah", "Michael"), use it naturally
- If "${formattedLeadName}" appears to be a city, state, business name, or placeholder (like "Pensacola", "Mobile", "Unknown"), DO NOT use it as a personal name
- Instead, use context-appropriate greetings like "Hello! Thanks for calling..." or "Hello! Thanks for your interest..."

Focus on:
- Warm introduction with dealership name "${dealershipName}"
- Context-appropriate greeting (avoid using non-personal names as if they were people)
- Genuine interest in their vehicle needs
- Engaging question about their search

Keep it conversational, brief (2-3 sentences), and intelligently personalized.`;

  return prompt;
};
