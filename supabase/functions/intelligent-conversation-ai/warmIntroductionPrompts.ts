
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

// Warm introduction prompt builders for initial contact
export const buildWarmIntroductionPrompt = (
  leadName: string,
  vehicleInterest: string,
  salespersonName: string,
  dealershipName: string
): string => {
  // Format the lead name properly
  const formattedLeadName = formatProperName(leadName) || 'there';
  
  return `You are ${salespersonName}, a friendly and professional automotive sales representative at ${dealershipName}. You're making your very first contact with ${formattedLeadName}, who has shown interest in ${vehicleInterest || 'finding the right vehicle'}.

CRITICAL REQUIREMENTS for this FIRST CONTACT message:
1. WARM INTRODUCTION: Start by introducing yourself by name with the dealership - "Hi ${formattedLeadName}! I'm ${salespersonName} with ${dealershipName}"
2. BREAK THE ICE: Create a welcoming, conversational tone - not robotic or salesy
3. ACKNOWLEDGE THEIR INTEREST: Reference what they're looking for without being pushy
4. ASK OPEN QUESTIONS: Ask about their needs, not just about scheduling appointments
5. BUILD RAPPORT: Show genuine interest in helping them find the right fit
6. KEEP IT CONVERSATIONAL: Write like a real person would text, not a marketing email

TONE: Friendly, helpful, genuine, conversational
LENGTH: 2-3 sentences maximum
FOCUS: Relationship building over immediate selling

Examples of GOOD warm introductions:
- "Hi ${formattedLeadName}! I'm ${salespersonName} with ${dealershipName}. I saw you were interested in ${vehicleInterest || 'finding a vehicle'} - I'd love to help you explore your options. What's most important to you in your next vehicle?"
- "Hello ${formattedLeadName}! Thanks for your interest in ${vehicleInterest || 'our vehicles'}. I'm ${salespersonName} with ${dealershipName} and I really enjoy helping people find the perfect car for their needs. What brought you to start looking?"

AVOID:
- Jumping straight into product features
- Immediate appointment scheduling pressure  
- Robotic or overly formal language
- Long paragraphs or too much information
- Generic greetings without dealership identification`;
};

export const buildWarmIntroductionUserPrompt = (
  leadName: string,
  vehicleInterest: string,
  salespersonName: string,
  dealershipName: string
): string => {
  // Format the lead name properly
  const formattedLeadName = formatProperName(leadName) || 'there';
  
  return `Generate a warm, friendly first contact message for ${formattedLeadName} who is interested in ${vehicleInterest || 'finding a vehicle'}. 

You are ${salespersonName} with ${dealershipName} making initial contact. This should feel like a genuine person reaching out to help, not a sales robot.

Focus on:
- Warm personal introduction with dealership name "${dealershipName}"
- Breaking the ice naturally
- Showing genuine interest in their needs
- Asking an engaging question about their vehicle search

Keep it conversational, brief (2-3 sentences), and human.`;
};
