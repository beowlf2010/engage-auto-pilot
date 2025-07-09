import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { recordType, count = 50 } = await req.json();

    console.log(`🔄 Generating ${count} ${recordType} test records...`);

    let results = { success: false, message: '', data: null };

    switch (recordType) {
      case 'leads':
        results = await generateLeads(supabaseClient, count);
        break;
      case 'inventory':
        results = await generateInventory(supabaseClient, count);
        break;
      case 'conversations':
        results = await generateConversations(supabaseClient, count);
        break;
      case 'appointments':
        results = await generateAppointments(supabaseClient, count);
        break;
      case 'all':
        results = await generateAllTestData(supabaseClient);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid record type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateLeads(supabase: any, count: number) {
  const firstNames = ['James', 'Maria', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const leadSources = ['AutoTrader', 'Cars.com', 'CarGurus', 'Website Form', 'Phone Inquiry', 'Referral', 'Facebook', 'Google Ads', 'Walk-in', 'Trade-in Tool'];
  const vehicleInterests = ['2024 Chevrolet Malibu', '2023 GMC Sierra 1500', '2024 Chevrolet Equinox', '2023 Chevrolet Tahoe', '2024 GMC Acadia', '2023 Chevrolet Silverado', '2024 Chevrolet Traverse', '2023 GMC Canyon', '2024 Chevrolet Blazer', '2023 Chevrolet Camaro'];
  const cities = ['Atlanta', 'Marietta', 'Alpharetta', 'Roswell', 'Sandy Springs', 'Decatur', 'Kennesaw', 'Smyrna', 'Dunwoody', 'Johns Creek'];
  
  const leads = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const phoneBase = '470' + Math.floor(Math.random() * 9000000 + 1000000);
    const aiOptIn = Math.random() > 0.3; // 70% have AI enabled
    const createdDaysAgo = Math.floor(Math.random() * 30); // Last 30 days
    
    leads.push({
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Park', 'Pine', 'Maple'][Math.floor(Math.random() * 5)]} St`,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: 'GA',
      postal_code: `30${Math.floor(Math.random() * 900) + 100}`,
      source: leadSources[Math.floor(Math.random() * leadSources.length)],
      vehicle_interest: vehicleInterests[Math.floor(Math.random() * vehicleInterests.length)],
      ai_opt_in: aiOptIn,
      ai_stage: aiOptIn ? ['initial_contact', 'follow_up', 'nurture'][Math.floor(Math.random() * 3)] : null,
      lead_temperature: Math.floor(Math.random() * 100),
      message_intensity: ['gentle', 'standard', 'aggressive'][Math.floor(Math.random() * 3)],
      ai_strategy_bucket: ['marketplace', 'website_forms', 'phone_up', 'referral_repeat'][Math.floor(Math.random() * 4)],
      ai_aggression_level: Math.floor(Math.random() * 5) + 1,
      created_at: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  const { data, error } = await supabase.from('leads').insert(leads).select();
  
  if (error) throw error;

  // Generate phone numbers for each lead
  for (const lead of data) {
    const phoneBase = '470' + Math.floor(Math.random() * 9000000 + 1000000);
    await supabase.from('phone_numbers').insert({
      lead_id: lead.id,
      number: phoneBase,
      type: 'mobile',
      is_primary: true,
      status: 'active'
    });
  }

  return { success: true, message: `Generated ${data.length} leads with phone numbers`, data: data.length };
}

async function generateInventory(supabase: any, count: number) {
  const makes = ['Chevrolet', 'GMC'];
  const models = {
    'Chevrolet': ['Malibu', 'Equinox', 'Traverse', 'Tahoe', 'Silverado', 'Camaro', 'Corvette', 'Blazer', 'Trax'],
    'GMC': ['Sierra', 'Acadia', 'Terrain', 'Yukon', 'Canyon', 'Savana', 'Hummer EV']
  };
  const years = [2022, 2023, 2024];
  const conditions = ['new', 'used', 'certified'];
  const colors = ['White', 'Black', 'Silver', 'Red', 'Blue', 'Gray', 'Beige', 'Green'];
  const transmissions = ['Automatic', 'Manual', 'CVT'];
  const fuels = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];

  const inventory = [];

  for (let i = 0; i < count; i++) {
    const make = makes[Math.floor(Math.random() * makes.length)];
    const model = models[make][Math.floor(Math.random() * models[make].length)];
    const year = years[Math.floor(Math.random() * years.length)];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const stockNumber = condition === 'new' ? `C${Math.floor(Math.random() * 90000) + 10000}` : `B${Math.floor(Math.random() * 90000) + 10000}`;
    
    inventory.push({
      make,
      model,
      year,
      vin: generateVIN(),
      stock_number: stockNumber,
      condition,
      status: Math.random() > 0.8 ? 'sold' : 'available',
      price: Math.floor(Math.random() * 50000) + 20000,
      mileage: condition === 'new' ? Math.floor(Math.random() * 50) : Math.floor(Math.random() * 80000) + 10000,
      exterior_color: colors[Math.floor(Math.random() * colors.length)],
      interior_color: colors[Math.floor(Math.random() * colors.length)],
      transmission: transmissions[Math.floor(Math.random() * transmissions.length)],
      fuel_type: fuels[Math.floor(Math.random() * fuels.length)],
      days_in_inventory: Math.floor(Math.random() * 120),
      created_at: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  const { data, error } = await supabase.from('inventory').insert(inventory).select();
  
  if (error) throw error;

  return { success: true, message: `Generated ${data.length} inventory records`, data: data.length };
}

async function generateConversations(supabase: any, count: number) {
  // Get some leads to create conversations for
  const { data: leads } = await supabase.from('leads').select('id').limit(50);
  
  if (!leads || leads.length === 0) {
    return { success: false, message: 'No leads found to create conversations for' };
  }

  const outboundMessages = [
    "Hi {name}! Thanks for your interest in the {vehicle}. I'd love to help you find the perfect vehicle. When would be a good time to chat?",
    "Hello {name}! I saw you're looking at the {vehicle}. We have some great incentives available this month. Are you available for a quick call?",
    "Hi {name}, just wanted to follow up on the {vehicle} you inquired about. We have it in stock and ready for a test drive. What's your availability?",
    "Good morning {name}! The {vehicle} you're interested in is still available. Would you like to schedule a time to see it in person?",
    "Hi {name}! We have some great financing options available for the {vehicle}. Would you like me to run some numbers for you?"
  ];

  const inboundMessages = [
    "Yes, I'm interested! What's the best price you can do?",
    "Can you tell me more about the warranty?",
    "I'd like to schedule a test drive this weekend",
    "What financing options do you have available?",
    "Is this vehicle still available?",
    "Can you send me more photos?",
    "What's the trade-in value of my current car?",
    "I'm ready to make a deal. When can we meet?",
    "Thanks for the info. I need to think about it.",
    "Not interested anymore, thanks."
  ];

  const conversations = [];

  for (let i = 0; i < count; i++) {
    const lead = leads[Math.floor(Math.random() * leads.length)];
    const isOutbound = Math.random() > 0.4; // 60% outbound, 40% inbound
    const messages = isOutbound ? outboundMessages : inboundMessages;
    const message = messages[Math.floor(Math.random() * messages.length)];
    const daysAgo = Math.floor(Math.random() * 14);
    
    conversations.push({
      lead_id: lead.id,
      direction: isOutbound ? 'out' : 'in',
      body: message.replace('{name}', 'there').replace('{vehicle}', 'vehicle'),
      ai_generated: isOutbound && Math.random() > 0.3, // 70% of outbound are AI
      sent_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
    });
  }

  const { data, error } = await supabase.from('conversations').insert(conversations).select();
  
  if (error) throw error;

  return { success: true, message: `Generated ${data.length} conversation messages`, data: data.length };
}

async function generateAppointments(supabase: any, count: number) {
  // Get some leads to create appointments for
  const { data: leads } = await supabase.from('leads').select('id').limit(30);
  
  if (!leads || leads.length === 0) {
    return { success: false, message: 'No leads found to create appointments for' };
  }

  const appointmentTypes = ['test_drive', 'consultation', 'delivery', 'service_followup'];
  const statuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
  const durations = [30, 45, 60, 90, 120];

  const appointments = [];

  for (let i = 0; i < count; i++) {
    const lead = leads[Math.floor(Math.random() * leads.length)];
    const type = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const daysFromNow = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
    const scheduledTime = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    
    // Set business hours (9 AM to 6 PM)
    scheduledTime.setHours(9 + Math.floor(Math.random() * 9), [0, 15, 30, 45][Math.floor(Math.random() * 4)], 0, 0);
    
    appointments.push({
      lead_id: lead.id,
      title: `${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Appointment`,
      appointment_type: type,
      status,
      scheduled_at: scheduledTime.toISOString(),
      duration_minutes: durations[Math.floor(Math.random() * durations.length)],
      location: 'Dealership Showroom',
      created_by: '00000000-0000-0000-0000-000000000001', // Default admin user
      created_at: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  const { data, error } = await supabase.from('appointments').insert(appointments).select();
  
  if (error) throw error;

  return { success: true, message: `Generated ${data.length} appointments`, data: data.length };
}

async function generateAllTestData(supabase: any) {
  console.log('🚀 Generating comprehensive test data set...');
  
  const results = {
    leads: await generateLeads(supabase, 100),
    inventory: await generateInventory(supabase, 75),
  };
  
  // Generate conversations and appointments after leads exist
  results.conversations = await generateConversations(supabase, 200);
  results.appointments = await generateAppointments(supabase, 30);

  const totalRecords = Object.values(results).reduce((sum, result) => sum + (result.data || 0), 0);
  
  return {
    success: true,
    message: `Generated complete test data set: ${totalRecords} total records`,
    data: results
  };
}

function generateVIN(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ1234567890';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}