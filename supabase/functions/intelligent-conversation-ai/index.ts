
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced vehicle category classification
const classifyVehicle = (vehicleInterest: string) => {
  const interest = vehicleInterest.toLowerCase();
  
  // Electric/Hybrid vehicles
  const evBrands = ['tesla', 'rivian', 'lucid', 'polestar', 'bmw i', 'audi e-tron', 'mercedes eqs', 'ford lightning', 'chevy bolt', 'nissan leaf'];
  const hybridTerms = ['hybrid', 'electric', 'ev', 'plug-in', 'prius'];
  
  // Luxury brands
  const luxuryBrands = ['tesla', 'bmw', 'mercedes', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'genesis', 'porsche', 'jaguar', 'land rover', 'volvo'];
  
  // Economy brands
  const economyBrands = ['honda', 'toyota', 'nissan', 'hyundai', 'kia', 'mazda', 'subaru', 'mitsubishi'];
  
  // Truck/SUV focus
  const truckSuvTerms = ['truck', 'suv', 'crossover', 'pickup', 'f-150', 'silverado', 'ram', 'tahoe', 'suburban', 'explorer'];
  
  const isEV = evBrands.some(brand => interest.includes(brand)) || hybridTerms.some(term => interest.includes(term));
  const isLuxury = luxuryBrands.some(brand => interest.includes(brand));
  const isEconomy = economyBrands.some(brand => interest.includes(brand));
  const isTruckSUV = truckSuvTerms.some(term => interest.includes(term));
  const isTesla = interest.includes('tesla');
  
  return {
    isEV,
    isLuxury,
    isEconomy,
    isTruckSUV,
    isTesla,
    category: isTesla ? 'tesla' : isEV ? 'electric' : isLuxury ? 'luxury' : isEconomy ? 'economy' : isTruckSUV ? 'truck_suv' : 'general'
  };
};

// Check for repetitive conversations
const analyzeConversationPattern = (conversationHistory: string) => {
  const lines = conversationHistory.split('\n');
  const customerLines = lines.filter(line => line.startsWith('Customer:'));
  const salesLines = lines.filter(line => line.startsWith('Sales:'));
  
  // Check for repeated sales messages
  const lastSalesMessages = salesLines.slice(-3);
  const hasRepetitiveGreeting = lastSalesMessages.some(msg => 
    msg.includes('Hi ') && msg.includes('What questions can I answer')
  );
  
  // Check conversation length
  const isEstablishedConversation = customerLines.length > 1 || salesLines.length > 2;
  
  return {
    hasRepetitiveGreeting,
    isEstablishedConversation,
    customerMessageCount: customerLines.length,
    salesMessageCount: salesLines.length
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { 
      leadName, 
      vehicleInterest, 
      lastCustomerMessage, 
      conversationHistory, 
      leadInfo,
      conversationLength,
      inventoryStatus 
    } = await req.json();

    console.log(`🤖 Processing intelligent AI request for: ${leadName}`);
    console.log(`🚗 Vehicle interest: ${vehicleInterest}`);
    console.log(`💬 Last message: ${lastCustomerMessage}`);

    // Classify the customer's vehicle interest
    const requestedCategory = classifyVehicle(vehicleInterest || '');
    const messageCategory = classifyVehicle(lastCustomerMessage || '');
    
    // Analyze conversation patterns
    const conversationPattern = analyzeConversationPattern(conversationHistory || '');

    let systemPrompt = `You are Finn, a professional automotive sales assistant. Your goal is to be helpful, honest, and build trust through transparency.

CRITICAL RULES:
- Keep messages under 160 characters for SMS
- Be conversational and personable, not pushy or salesy
- ALWAYS be completely honest about inventory - never mislead customers
- DO NOT use generic greetings if this is an established conversation
- Focus on the customer's actual question or concern
- If we don't have what they want, acknowledge it directly and offer helpful alternatives

Customer Information:
- Name: ${leadName}
- Original Interest: ${vehicleInterest}
- Vehicle Category: ${requestedCategory.category}
- Conversation Length: ${conversationLength} messages
- Established Conversation: ${conversationPattern.isEstablishedConversation}

CONVERSATION CONTEXT ANALYSIS:
- Customer Messages: ${conversationPattern.customerMessageCount}
- Sales Messages: ${conversationPattern.salesMessageCount}
- Has Repetitive Greeting: ${conversationPattern.hasRepetitiveGreeting}

${conversationPattern.hasRepetitiveGreeting ? 
  'WARNING: Avoid repetitive greetings! This customer has already been greeted multiple times.' : 
  ''
}

INVENTORY ANALYSIS:`;

    // Tesla-specific handling
    if (requestedCategory.isTesla) {
      systemPrompt += `\n❌ IMPORTANT: WE DO NOT SELL TESLA VEHICLES
- Tesla only sells through their own stores and website
- We are not a Tesla dealership
- Be honest about this limitation
- Offer to help with other electric vehicles if they're interested in EVs`;
    } else if (inventoryStatus?.hasRequestedVehicle) {
      systemPrompt += `\n✅ WE HAVE MATCHING ${inventoryStatus.requestedMake?.toUpperCase()} VEHICLES:
${inventoryStatus.matchingVehicles?.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n') || ''}`;
    } else if (inventoryStatus?.requestedMake) {
      systemPrompt += `\n❌ WE DO NOT HAVE ${inventoryStatus.requestedMake.toUpperCase()} VEHICLES IN STOCK.`;
      
      if (inventoryStatus.availableAlternatives?.length > 0) {
        systemPrompt += `\n\nRELEVANT ALTERNATIVES (same category):
${inventoryStatus.availableAlternatives.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}`;
      }
    }

    // Add conversation-specific guidance
    if (conversationPattern.isEstablishedConversation) {
      systemPrompt += `\n\nCONVERSATION GUIDANCE:
- This is an ongoing conversation - DO NOT use generic greetings
- Address their specific question or concern directly
- Build on what's already been discussed
- Be helpful and move the conversation forward`;
    }

    const userPrompt = `Customer's latest message: "${lastCustomerMessage}"

Recent conversation context:
${conversationHistory}

Generate a response that:
1. ${conversationPattern.isEstablishedConversation ? 
     'Continues the conversation naturally (NO generic greetings)' : 
     'Provides a warm, professional greeting'
   }
2. Directly and honestly addresses their question
3. ${requestedCategory.isTesla ? 
     'Explains we cannot help with Tesla vehicles (Tesla direct sales only)' : 
     'Provides accurate inventory information'
   }
4. Offers genuinely helpful next steps
5. Is conversational and under 160 characters
6. Builds trust through transparency

${requestedCategory.isTesla ? 
  'TESLA RESPONSE: Politely explain that Tesla only sells direct and offer to help with other EVs.' : 
  ''
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    const aiResponse = await response.json();
    const generatedMessage = aiResponse.choices[0].message.content;

    console.log(`✅ Generated intelligent response: ${generatedMessage}`);

    return new Response(JSON.stringify({ 
      message: generatedMessage,
      confidence: 0.9,
      reasoning: `Context-aware response for ${requestedCategory.category} vehicle inquiry with honest inventory assessment${requestedCategory.isTesla ? ' (Tesla limitation explained)' : ''}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in intelligent conversation AI:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
