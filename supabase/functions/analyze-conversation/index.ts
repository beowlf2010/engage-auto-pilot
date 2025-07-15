import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();
    
    console.log('Analyze conversation request:', { action });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get OpenAI API key from settings table
    const { data: openAIKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'OPENAI_API_KEY')
      .maybeSingle();

    if (!openAIKeySetting?.value) {
      throw new Error('OpenAI API key not configured in settings');
    }

    const openAIApiKey = openAIKeySetting.value;

    let result = {};

    switch (action) {
      case 'summarize':
        result = await summarizeConversation(payload.messages, openAIApiKey);
        break;
      case 'sentiment':
        result = await analyzeSentiment(payload.message, openAIApiKey);
        break;
      case 'suggestions':
        result = await generateSuggestions(payload.messages, payload.leadContext, openAIApiKey);
        break;
      case 'compliance_check':
        result = await checkCompliance(payload.message, payload.ruleType, openAIApiKey);
        break;
      case 'quality_score':
        result = await analyzeQuality(payload.messages, payload.sentiments, openAIApiKey);
        break;
      case 'training_recommendations':
        result = await generateTrainingRecommendations(payload.qualityScores, payload.violations, payload.salespersonId, openAIApiKey);
        break;
      case 'sales_forecast':
        result = await generateSalesForecast(payload, openAIApiKey);
        break;
      case 'conversion_prediction':
        result = await generateConversionPrediction(payload, openAIApiKey);
        break;
      case 'inventory_demand_prediction':
        result = await generateInventoryDemandPrediction(payload, openAIApiKey);
        break;
      case 'market_intelligence':
        result = await generateMarketIntelligence(payload, openAIApiKey);
        break;
      case 'competitive_analysis':
        result = await generateCompetitiveAnalysis(payload, openAIApiKey);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-conversation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function summarizeConversation(messages: any[], openAIApiKey: string) {
  if (!openAIApiKey) {
    return { summary: 'OpenAI API key not configured', keyPoints: [] };
  }

  const conversationText = messages.map(msg => 
    `${msg.direction === 'in' ? 'Customer' : 'Salesperson'}: ${msg.body}`
  ).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are analyzing automotive sales conversations. Provide a concise summary and extract key points. Return a JSON object with 'summary' (string) and 'keyPoints' (array of strings).`
        },
        {
          role: 'user',
          content: `Analyze this conversation:\n\n${conversationText}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  
  return {
    summary: result.summary || 'Unable to generate summary',
    keyPoints: result.keyPoints || []
  };
}

async function analyzeSentiment(message: string, openAIApiKey: string) {
  if (!openAIApiKey) {
    return { sentimentScore: 0, sentimentLabel: 'neutral', confidenceScore: 0.5, emotions: [] };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze the sentiment of this message. Return JSON with: sentimentScore (-1.0 to 1.0), sentimentLabel ('positive', 'negative', or 'neutral'), confidenceScore (0.0 to 1.0), and emotions (array of strings).`
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateSuggestions(messages: any[], leadContext: any, openAIApiKey: string) {
  if (!openAIApiKey) {
    return { suggestions: [] };
  }

  const conversationText = messages.slice(-5).map(msg => 
    `${msg.direction === 'in' ? 'Customer' : 'Salesperson'}: ${msg.body}`
  ).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an automotive sales coach. Based on the conversation and lead context, suggest 2-3 appropriate response messages. Return JSON with 'suggestions' array containing objects with 'text', 'contextType', and 'confidence' fields.`
        },
        {
          role: 'user',
          content: `Lead: ${leadContext.firstName}, interested in: ${leadContext.vehicleInterest}, status: ${leadContext.status}\n\nRecent conversation:\n${conversationText}\n\nGenerate appropriate response suggestions.`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function checkCompliance(message: string, ruleType: string, openAIApiKey: string) {
  if (!openAIApiKey) {
    return { violation: false, detectedContent: '' };
  }

  const complianceRules = {
    'TCPA Violation Keywords': 'Check for TCPA violations like automated dialing, robocalls, or pre-recorded messages',
    'Do Not Call Violation': 'Check for do not call list violations or ignoring opt-out requests',
    'Inappropriate Language': 'Check for unprofessional, offensive, or inappropriate language',
    'Pressure Tactics': 'Check for high-pressure sales tactics, manipulation, or coercion',
    'Misleading Claims': 'Check for false or misleading claims about vehicles, pricing, or financing'
  };

  const ruleDescription = complianceRules[ruleType as keyof typeof complianceRules] || 'Check for compliance violations';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a compliance monitor for automotive sales. ${ruleDescription}. Return JSON with 'violation' (boolean) and 'detectedContent' (string with specific problematic text if violation found).`
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function analyzeQuality(messages: any[], sentiments: any[], openAIApiKey: string) {
  if (!openAIApiKey) {
    return { 
      professionalismScore: 5.0, 
      engagementScore: 5.0, 
      closeAttemptScore: 5.0,
      qualityFactors: [],
      improvementAreas: []
    };
  }

  const conversationText = messages.map(msg => 
    `${msg.direction === 'in' ? 'Customer' : 'Salesperson'}: ${msg.body}`
  ).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this automotive sales conversation for quality. Rate professionalism (0-10), engagement (0-10), and close attempts (0-10). Return JSON with these scores plus 'qualityFactors' and 'improvementAreas' arrays.`
        },
        {
          role: 'user',
          content: conversationText
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateTrainingRecommendations(qualityScores: any[], violations: any[], salespersonId: string, openAIApiKey: string) {
  if (!openAIApiKey) {
    return { recommendations: [] };
  }

  const analysisData = {
    averageScore: qualityScores.length > 0 ? qualityScores.reduce((sum, score) => sum + score.overall_score, 0) / qualityScores.length : 0,
    weakAreas: qualityScores.flatMap(score => score.improvement_areas || []),
    violationTypes: violations.map(v => v.violation_type),
    recentViolations: violations.length
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate personalized training recommendations for an automotive salesperson based on their performance data. Return JSON with 'recommendations' array containing objects with 'type', 'title', 'description', 'priority' ('low', 'medium', 'high'), 'skillsFocus' array, and optional 'dueDate'.`
        },
        {
          role: 'user',
          content: `Performance analysis: ${JSON.stringify(analysisData)}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateSalesForecast(payload: any, openaiKey: string) {
  const { period, historicalData, pipelineData } = payload;
  
  const prompt = `Analyze the following historical sales data and current pipeline to generate a ${period} sales forecast:

Historical Data: ${JSON.stringify(historicalData.slice(0, 50))}
Pipeline Data: ${JSON.stringify(pipelineData.slice(0, 20))}

Generate a forecast with:
1. Predicted units to sell
2. Predicted revenue
3. Confidence score (0-1)
4. Key factors influencing the forecast

Return JSON with: { "predictedUnits": number, "predictedRevenue": number, "confidenceScore": number, "factors": string[] }`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert sales forecasting analyst. Analyze data and provide accurate forecasts in JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const forecast = JSON.parse(content);
      return { forecast };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      const units = Math.max(1, Math.floor(historicalData.length * 0.8 + pipelineData.length * 0.3));
      const avgDealValue = historicalData.length > 0 ? 
        historicalData.reduce((sum: number, deal: any) => sum + (deal.sale_amount || 25000), 0) / historicalData.length : 25000;
      
      return {
        forecast: {
          predictedUnits: units,
          predictedRevenue: units * avgDealValue,
          confidenceScore: 0.7,
          factors: ['Historical performance', 'Current pipeline strength', 'Market conditions']
        }
      };
    }
  } catch (error) {
    console.error('Error generating sales forecast:', error);
    // Return fallback forecast
    const units = Math.max(1, historicalData.length / 4);
    return {
      forecast: {
        predictedUnits: units,
        predictedRevenue: units * 25000,
        confidenceScore: 0.5,
        factors: ['Fallback calculation based on historical average']
      }
    };
  }
}

async function generateConversionPrediction(payload: any, openaiKey: string) {
  const { lead, conversations, temperatureScore } = payload;
  
  const prompt = `Analyze this lead's conversion potential:

Lead Info: ${JSON.stringify(lead)}
Recent Conversations: ${JSON.stringify(conversations.slice(0, 10))}
Temperature Score: ${temperatureScore}

Predict:
1. Conversion probability (0-1)
2. Predicted close date
3. Predicted sale amount
4. Key factors affecting conversion

Return JSON with: { "conversionProbability": number, "predictedCloseDate": "YYYY-MM-DD", "predictedSaleAmount": number, "factors": string[] }`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert sales conversion analyst. Analyze lead data and predict conversion likelihood.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const prediction = JSON.parse(content);
      return { prediction };
    } catch (parseError) {
      // Fallback calculation
      const baseProb = temperatureScore / 100 * 0.8;
      const responseBonus = conversations.length > 0 ? 0.1 : 0;
      const conversionProbability = Math.min(0.95, Math.max(0.05, baseProb + responseBonus));
      
      const daysToClose = Math.max(1, 30 - (temperatureScore / 10));
      const predictedCloseDate = new Date(Date.now() + daysToClose * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      return {
        prediction: {
          conversionProbability,
          predictedCloseDate,
          predictedSaleAmount: 28000,
          factors: ['Temperature score', 'Engagement level', 'Response history']
        }
      };
    }
  } catch (error) {
    console.error('Error generating conversion prediction:', error);
    // Return fallback prediction
    const conversionProbability = Math.max(0.1, temperatureScore / 100);
    return {
      prediction: {
        conversionProbability,
        predictedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predictedSaleAmount: 25000,
        factors: ['Fallback calculation']
      }
    };
  }
}

async function generateInventoryDemandPrediction(payload: any, openaiKey: string) {
  const { inventory, velocityData, leadInterests, marketData } = payload;
  
  const prompt = `Analyze this vehicle's market demand:

Vehicle: ${JSON.stringify(inventory)}
Velocity Data: ${JSON.stringify(velocityData)}
Lead Interests: ${JSON.stringify(leadInterests)}
Market Data: ${JSON.stringify(marketData)}

Predict:
1. Demand score (0-100)
2. Days to sell
3. Seasonal factor
4. Market demand level (low/medium/high)
5. Price competitiveness (below/market/above)

Return JSON with: { "demandScore": number, "predictedDaysToSell": number, "seasonalFactor": number, "marketDemandLevel": string, "priceCompetitiveness": string, "predictionAccuracy": number }`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert automotive market analyst. Analyze vehicle demand patterns and market positioning.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const prediction = JSON.parse(content);
      return { demandPrediction: prediction };
    } catch (parseError) {
      // Fallback calculation based on available data
      let demandScore = 50; // Base score
      
      // Adjust based on age
      const currentYear = new Date().getFullYear();
      const vehicleAge = currentYear - (inventory.year || currentYear);
      if (vehicleAge < 3) demandScore += 20;
      else if (vehicleAge > 7) demandScore -= 20;
      
      // Adjust based on mileage
      if (inventory.mileage && inventory.mileage < 30000) demandScore += 15;
      else if (inventory.mileage && inventory.mileage > 100000) demandScore -= 15;
      
      // Adjust based on lead interest
      demandScore += Math.min(20, leadInterests.length * 5);
      
      // Adjust based on days in inventory
      if (marketData.avgDaysInInventory > 90) demandScore -= 15;
      else if (marketData.avgDaysInInventory < 30) demandScore += 15;
      
      demandScore = Math.max(0, Math.min(100, demandScore));
      
      const predictedDaysToSell = velocityData?.avg_days_to_sell || (100 - demandScore) * 2;
      
      return {
        demandPrediction: {
          demandScore,
          predictedDaysToSell: Math.round(predictedDaysToSell),
          seasonalFactor: 1.0,
          marketDemandLevel: demandScore > 70 ? 'high' : demandScore > 40 ? 'medium' : 'low',
          priceCompetitiveness: 'market',
          predictionAccuracy: 0.75
        }
      };
    }
  } catch (error) {
    console.error('Error generating inventory demand prediction:', error);
    return {
      demandPrediction: {
        demandScore: 50,
        predictedDaysToSell: 60,
        seasonalFactor: 1.0,
        marketDemandLevel: 'medium',
        priceCompetitiveness: 'market',
        predictionAccuracy: 0.5
      }
    };
  }
}

async function generateMarketIntelligence(payload: any, openaiKey: string) {
  const { marketSegment, inventory, recentSales, leads } = payload;
  
  const prompt = `Analyze current market conditions for ${marketSegment}:

Current Inventory: ${JSON.stringify(inventory.slice(0, 20))}
Recent Sales: ${JSON.stringify(recentSales.slice(0, 10))}
Recent Leads: ${JSON.stringify(leads.slice(0, 10))}

Analyze and provide:
1. Demand trend (increasing/stable/decreasing)
2. Price trend (increasing/stable/decreasing)
3. Inventory levels (low/normal/high)
4. Competitive pressure (low/moderate/high)
5. Seasonal factor (0.5-1.5)
6. Economic indicators
7. Recommendations

Return JSON with: { "demandTrend": string, "priceTrend": string, "inventoryLevels": string, "competitivePressure": string, "seasonalFactor": number, "economicIndicators": {}, "recommendations": string[], "dataSources": string[] }`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert automotive market intelligence analyst. Provide comprehensive market analysis.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1200
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const analysis = JSON.parse(content);
      return { marketAnalysis: analysis };
    } catch (parseError) {
      // Fallback analysis
      const currentMonth = new Date().getMonth();
      const seasonalFactor = currentMonth >= 3 && currentMonth <= 8 ? 1.2 : 0.9; // Spring/Summer boost
      
      return {
        marketAnalysis: {
          demandTrend: leads.length > recentSales.length ? 'increasing' : 'stable',
          priceTrend: 'stable',
          inventoryLevels: inventory.length > 50 ? 'high' : inventory.length > 20 ? 'normal' : 'low',
          competitivePressure: 'moderate',
          seasonalFactor,
          economicIndicators: {
            leadVolume: leads.length,
            salesVolume: recentSales.length,
            inventoryTurn: recentSales.length / Math.max(1, inventory.length)
          },
          recommendations: [
            'Monitor inventory levels closely',
            'Adjust pricing based on seasonal trends',
            'Focus on high-demand vehicle segments'
          ],
          dataSources: ['Internal sales data', 'Lead generation data', 'Inventory tracking']
        }
      };
    }
  } catch (error) {
    console.error('Error generating market intelligence:', error);
    return {
      marketAnalysis: {
        demandTrend: 'stable',
        priceTrend: 'stable',
        inventoryLevels: 'normal',
        competitivePressure: 'moderate',
        seasonalFactor: 1.0,
        economicIndicators: {},
        recommendations: ['Continue monitoring market conditions'],
        dataSources: ['Fallback analysis']
      }
    };
  }
}

async function generateCompetitiveAnalysis(payload: any, openaiKey: string) {
  const { vehicle, inventoryCount } = payload;
  
  const prompt = `Analyze competitive positioning for this vehicle:

Vehicle: ${JSON.stringify(vehicle)}
Our Inventory Count: ${inventoryCount}

Provide competitive analysis:
1. Estimated competitor average price
2. Number of competitors
3. Our price position (below/market/above)
4. Market share estimate
5. Competitive advantages

Return JSON with: { "competitorAvgPrice": number, "competitorCount": number, "pricePosition": string, "marketShareEstimate": number, "competitiveAdvantages": string[] }`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert automotive competitive analyst. Analyze market positioning and competition.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const analysis = JSON.parse(content);
      return { competitiveAnalysis: analysis };
    } catch (parseError) {
      // Fallback competitive analysis
      const basePrice = vehicle.avgPrice || 25000;
      const competitorAvgPrice = basePrice * (0.95 + Math.random() * 0.1); // ±5% variation
      
      let pricePosition = 'market';
      if (basePrice < competitorAvgPrice * 0.95) pricePosition = 'below';
      else if (basePrice > competitorAvgPrice * 1.05) pricePosition = 'above';
      
      return {
        competitiveAnalysis: {
          competitorAvgPrice: Math.round(competitorAvgPrice),
          competitorCount: Math.floor(3 + Math.random() * 7), // 3-10 competitors
          pricePosition,
          marketShareEstimate: Math.min(0.3, inventoryCount / 100), // Rough estimate
          competitiveAdvantages: [
            'Local dealership presence',
            'Comprehensive warranty',
            'Service department quality'
          ]
        }
      };
    }
  } catch (error) {
    console.error('Error generating competitive analysis:', error);
    return {
      competitiveAnalysis: {
        competitorAvgPrice: vehicle.avgPrice || 25000,
        competitorCount: 5,
        pricePosition: 'market',
        marketShareEstimate: 0.1,
        competitiveAdvantages: ['Competitive pricing', 'Quality service']
      }
    };
  }
}
