import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  lowStockThreshold: number;
  agingThreshold: number;
  priceVarianceThreshold: number;
  leadOpportunityThreshold: number;
}

interface InventoryAlert {
  type: 'low_stock' | 'aging_inventory' | 'price_optimization' | 'lead_opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  vehicleId?: string;
  data: any;
  actionable: boolean;
  recommendedActions: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, config } = await req.json();

    console.log('Processing inventory alerts:', action);

    switch (action) {
      case 'analyze_inventory':
        return await analyzeInventoryAlerts(supabase, config);
      case 'process_real_time':
        return await processRealTimeAlerts(supabase);
      case 'get_alerts':
        return await getActiveAlerts(supabase);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in inventory-alerts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

async function analyzeInventoryAlerts(supabase: any, config: AlertConfig) {
  const alerts: InventoryAlert[] = [];

  // 1. Low Stock Analysis by Make/Model
  console.log('Analyzing low stock alerts...');
  const { data: lowStockData } = await supabase
    .from('inventory')
    .select('make, model, year, condition, status')
    .eq('status', 'available');

  if (lowStockData) {
    const stockByModel = lowStockData.reduce((acc: any, vehicle: any) => {
      const key = `${vehicle.make}_${vehicle.model}_${vehicle.year}_${vehicle.condition}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    Object.entries(stockByModel).forEach(([key, count]) => {
      if ((count as number) <= config.lowStockThreshold) {
        const [make, model, year, condition] = key.split('_');
        alerts.push({
          type: 'low_stock',
          severity: (count as number) === 0 ? 'critical' : 'high',
          title: 'Low Stock Alert',
          message: `Only ${count} ${year} ${make} ${model} (${condition}) remaining in inventory`,
          data: { make, model, year, condition, count },
          actionable: true,
          recommendedActions: [
            'Order more inventory from manufacturer',
            'Adjust pricing to slow sales',
            'Create marketing campaign for similar vehicles',
            'Check incoming orders/deliveries'
          ]
        });
      }
    });
  }

  // 2. Aging Inventory Analysis
  console.log('Analyzing aging inventory...');
  const { data: agingData } = await supabase
    .from('inventory')
    .select('id, stock_number, make, model, year, price, days_in_inventory, condition')
    .eq('status', 'available')
    .gte('days_in_inventory', config.agingThreshold)
    .order('days_in_inventory', { ascending: false });

  if (agingData) {
    agingData.forEach((vehicle: any) => {
      const severity = vehicle.days_in_inventory > 120 ? 'critical' : 
                     vehicle.days_in_inventory > 90 ? 'high' : 'medium';
      
      alerts.push({
        type: 'aging_inventory',
        severity,
        title: 'Aging Inventory Alert',
        message: `${vehicle.year} ${vehicle.make} ${vehicle.model} has been in inventory for ${vehicle.days_in_inventory} days`,
        vehicleId: vehicle.id,
        data: vehicle,
        actionable: true,
        recommendedActions: [
          'Consider price reduction',
          'Create special promotion',
          'Move to wholesale',
          'Feature in marketing campaign',
          'Analyze similar sold vehicles for pricing insights'
        ]
      });
    });
  }

  // 3. Price Optimization Analysis
  console.log('Analyzing price optimization opportunities...');
  const { data: priceData } = await supabase
    .from('inventory')
    .select('id, stock_number, make, model, year, price, msrp, condition, days_in_inventory')
    .eq('status', 'available')
    .not('price', 'is', null)
    .not('msrp', 'is', null);

  if (priceData) {
    priceData.forEach((vehicle: any) => {
      const discountPercent = ((vehicle.msrp - vehicle.price) / vehicle.msrp) * 100;
      const shouldReducePrice = vehicle.days_in_inventory > 60 && discountPercent < 10;
      const overpriced = discountPercent < 5 && vehicle.days_in_inventory > 30;

      if (shouldReducePrice || overpriced) {
        alerts.push({
          type: 'price_optimization',
          severity: overpriced ? 'high' : 'medium',
          title: 'Price Optimization Opportunity',
          message: `${vehicle.year} ${vehicle.make} ${vehicle.model} may be overpriced (${discountPercent.toFixed(1)}% discount, ${vehicle.days_in_inventory} days)`,
          vehicleId: vehicle.id,
          data: { ...vehicle, discountPercent },
          actionable: true,
          recommendedActions: [
            `Consider reducing price by $${Math.round(vehicle.price * 0.05)}`,
            'Analyze competitor pricing',
            'Review market demand for similar vehicles',
            'Create limited-time promotion'
          ]
        });
      }
    });
  }

  // 4. Lead Conversion Opportunities
  console.log('Analyzing lead conversion opportunities...');
  const { data: leadOpportunities } = await supabase
    .from('inventory')
    .select(`
      id, stock_number, make, model, year, price, condition, leads_count,
      days_in_inventory
    `)
    .eq('status', 'available')
    .gte('leads_count', config.leadOpportunityThreshold)
    .order('leads_count', { ascending: false });

  if (leadOpportunities) {
    leadOpportunities.forEach((vehicle: any) => {
      const conversionRate = vehicle.leads_count > 0 ? 0 : 0; // This would be calculated from actual conversions
      
      alerts.push({
        type: 'lead_opportunity',
        severity: vehicle.leads_count > 5 ? 'high' : 'medium',
        title: 'High Lead Interest Vehicle',
        message: `${vehicle.year} ${vehicle.make} ${vehicle.model} has ${vehicle.leads_count} leads - conversion opportunity!`,
        vehicleId: vehicle.id,
        data: vehicle,
        actionable: true,
        recommendedActions: [
          'Contact recent leads immediately',
          'Create special offer for interested leads',
          'Schedule immediate follow-ups',
          'Ensure vehicle is properly showcased',
          'Consider price incentive for quick sale'
        ]
      });
    });
  }

  // Store alerts in database
  if (alerts.length > 0) {
    console.log(`Storing ${alerts.length} alerts in database...`);
    
    const alertRecords = alerts.map(alert => ({
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      vehicle_id: alert.vehicleId,
      alert_data: alert.data,
      actionable: alert.actionable,
      recommended_actions: alert.recommendedActions,
      is_active: true,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('inventory_alerts')
      .insert(alertRecords);

    if (insertError) {
      console.error('Error inserting alerts:', insertError);
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      alertsGenerated: alerts.length,
      alerts: alerts.slice(0, 10) // Return first 10 for preview
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}

async function processRealTimeAlerts(supabase: any) {
  // This would be called by database triggers for real-time processing
  console.log('Processing real-time alerts...');
  
  // Check for immediate alerts (new inventory, price changes, etc.)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: recentChanges } = await supabase
    .from('inventory')
    .select('*')
    .gte('updated_at', oneHourAgo.toISOString())
    .eq('status', 'available');

  const alerts: InventoryAlert[] = [];

  if (recentChanges) {
    recentChanges.forEach((vehicle: any) => {
      // Check for sudden price drops that might indicate urgency
      if (vehicle.price && vehicle.msrp && vehicle.price < vehicle.msrp * 0.8) {
        alerts.push({
          type: 'price_optimization',
          severity: 'high',
          title: 'Significant Price Reduction Detected',
          message: `${vehicle.year} ${vehicle.make} ${vehicle.model} price reduced significantly - may indicate urgency`,
          vehicleId: vehicle.id,
          data: vehicle,
          actionable: true,
          recommendedActions: [
            'Investigate reason for price reduction',
            'Ensure marketing reflects new price',
            'Contact interested leads immediately'
          ]
        });
      }
    });
  }

  return new Response(
    JSON.stringify({ success: true, realTimeAlerts: alerts.length }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}

async function getActiveAlerts(supabase: any) {
  const { data: alerts, error } = await supabase
    .from('inventory_alerts')
    .select(`
      *,
      inventory:vehicle_id (
        stock_number, make, model, year, condition
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return new Response(
    JSON.stringify({ alerts }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}

serve(handler);