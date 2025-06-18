
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vehicle category classification
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
  
  return {
    isEV,
    isLuxury,
    isEconomy,
    isTruckSUV,
    category: isEV ? 'electric' : isLuxury ? 'luxury' : isEconomy ? 'economy' : isTruckSUV ? 'truck_suv' : 'general'
  };
};

// Enhanced inventory matching with category awareness
const findRelevantAlternatives = (requestedVehicle: string, availableInventory: any[]) => {
  const requestedCategory = classifyVehicle(requestedVehicle);
  
  return availableInventory.filter(vehicle => {
    const vehicleDescription = `${vehicle.make} ${vehicle.model}`.toLowerCase();
    const vehicleCategory = classifyVehicle(vehicleDescription);
    
    // Prioritize same category matches
    if (requestedCategory.isEV && vehicleCategory.isEV) return true;
    if (requestedCategory.isLuxury && vehicleCategory.isLuxury) return true;
    if (requestedCategory.isEconomy && vehicleCategory.isEconomy) return true;
    if (requestedCategory.isTruckSUV && vehicleCategory.isTruckSUV) return true;
    
    return false;
  }).slice(0, 3);
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

    // Classify the customer's vehicle interest
    const requestedCategory = classifyVehicle(vehicleInterest);
    const messageCategory = classifyVehicle(lastCustomerMessage);
    
    // Find relevant alternatives if we don't have exact matches
    const relevantAlternatives = inventoryStatus.availableAlternatives ? 
      findRelevantAlternatives(vehicleInterest, inventoryStatus.availableAlternatives) : [];

    // Build enhanced context-aware system prompt
    let systemPrompt = `You are Finn, a professional automotive sales assistant. Your goal is to be helpful, honest, and build trust through transparency.

CRITICAL RULES:
- Keep messages under 160 characters for SMS
- Be conversational and personable, not pushy or salesy
- ALWAYS be completely honest about inventory - never mislead customers
- If we don't have what they want, acknowledge it directly and honestly
- Only suggest alternatives that make sense (same category/type of vehicle)
- Focus on understanding customer needs rather than pushing random inventory
- End with genuine questions or helpful next steps

Customer Information:
- Name: ${leadName}
- Original Interest: ${vehicleInterest}
- Vehicle Category: ${requestedCategory.category}
- Conversation Length: ${conversationLength} messages

INVENTORY ANALYSIS:`;

    if (inventoryStatus.hasRequestedVehicle) {
      systemPrompt += `\n✅ WE HAVE MATCHING ${inventoryStatus.requestedMake.toUpperCase()} VEHICLES:
${inventoryStatus.matchingVehicles.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}`;
    } else if (inventoryStatus.requestedMake) {
      systemPrompt += `\n❌ WE DO NOT HAVE ${inventoryStatus.requestedMake.toUpperCase()} VEHICLES IN STOCK.`;
      
      if (relevantAlternatives.length > 0) {
        systemPrompt += `\n\nRELEVANT ALTERNATIVES (same category):
${relevantAlternatives.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}`;
      } else {
        systemPrompt += `\n\nNO SIMILAR VEHICLES AVAILABLE IN OUR CURRENT INVENTORY.`;
      }
    }

    // Add conversation context analysis
    const isDirectQuestion = lastCustomerMessage.toLowerCase().includes('do you have') || 
                            lastCustomerMessage.toLowerCase().includes('any tesla') ||
                            lastCustomerMessage.toLowerCase().includes('got any') ||
                            lastCustomerMessage.includes('?');

    if (isDirectQuestion) {
      systemPrompt += `\n\nCUSTOMER ASKED A DIRECT QUESTION - Give a direct, honest answer first, then ask how you can help.`;
    }

    systemPrompt += `\n\nGenerate an honest, helpful response that builds trust and moves the conversation forward constructively.`;

    const userPrompt = `Customer's latest message: "${lastCustomerMessage}"

Recent conversation context:
${conversationHistory}

Generate a response that:
1. Directly and honestly addresses their question
2. If we don't have their requested vehicle, acknowledge it clearly
3. Only suggest alternatives if they're genuinely similar/relevant
4. Ask thoughtful questions to understand their needs better
5. Is conversational, helpful, and under 160 characters
6. Builds trust through transparency rather than pushing inventory

${requestedCategory.isEV ? 'NOTE: Customer is interested in electric vehicles - only suggest EV alternatives or ask about their EV priorities.' : ''}
${requestedCategory.isLuxury ? 'NOTE: Customer is interested in luxury vehicles - maintain appropriate tone and suggestions.' : ''}`;

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
      reasoning: `Context-aware response for ${requestedCategory.category} vehicle inquiry with honest inventory assessment`
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
