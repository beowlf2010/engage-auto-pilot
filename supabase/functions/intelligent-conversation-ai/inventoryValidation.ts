
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Enhanced inventory validation to prevent AI from claiming non-existent vehicles
export const validateInventoryAccuracy = async (vehicleInterest: string, leadId?: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return { hasRealInventory: false, actualVehicles: [], warning: 'inventory_check_failed' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const cleanInterest = vehicleInterest.toLowerCase().trim();
    console.log('🔍 STRICT inventory validation for:', cleanInterest);

    // Get lead's specific vehicle preferences if leadId provided
    let leadPreferences = null;
    if (leadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('vehicle_make, vehicle_model, vehicle_year, preferred_price_min, preferred_price_max')
        .eq('id', leadId)
        .single();
      
      if (lead) {
        leadPreferences = lead;
        console.log('🎯 Lead preferences:', leadPreferences);
      }
    }

    // Build strict inventory query WITHOUT artificial limits
    let query = supabase
      .from('inventory')
      .select('id, make, model, year, fuel_type, condition, price, status, stock_number, vin, trim')
      .eq('status', 'available')
      .not('model', 'eq', 'Unknown') // STRICT: Only vehicles with known models
      .not('model', 'is', null);
      // REMOVED: .limit(20) - NO MORE ARTIFICIAL LIMITS

    // Apply lead-specific filters if available
    if (leadPreferences) {
      if (leadPreferences.vehicle_make) {
        query = query.ilike('make', `%${leadPreferences.vehicle_make}%`);
      }
      if (leadPreferences.vehicle_model) {
        query = query.ilike('model', `%${leadPreferences.vehicle_model}%`);
      }
      if (leadPreferences.vehicle_year) {
        const year = parseInt(leadPreferences.vehicle_year);
        if (!isNaN(year)) {
          query = query.eq('year', year);
        }
      }
      if (leadPreferences.preferred_price_min) {
        query = query.gte('price', leadPreferences.preferred_price_min);
      }
      if (leadPreferences.preferred_price_max) {
        query = query.lte('price', leadPreferences.preferred_price_max);
      }
    } else {
      // Fallback to parsing vehicle interest
      const makeMatch = cleanInterest.match(/\b(chevrolet|chevy|gmc|buick|cadillac|ford|toyota|honda|bmw|mercedes|audi|nissan|hyundai)\b/i);
      if (makeMatch) {
        const make = makeMatch[1].toLowerCase();
        if (make === 'chevy') {
          query = query.ilike('make', '%chevrolet%');
        } else {
          query = query.ilike('make', `%${make}%`);
        }
      }
    }

    const { data: inventory, error } = await query;

    if (error) {
      console.error('❌ Error in strict inventory check:', error);
      return { hasRealInventory: false, actualVehicles: [], warning: 'inventory_check_failed' };
    }

    // STRICT validation: Only count vehicles with complete, accurate data
    const validatedVehicles = (inventory || []).filter(vehicle => {
      return vehicle.make && 
             vehicle.model && 
             vehicle.model !== 'Unknown' && 
             vehicle.year && 
             vehicle.year > 1990 && 
             vehicle.year <= new Date().getFullYear() + 2;
    });

    console.log(`📊 STRICT validation results:`, {
      totalFound: inventory?.length || 0,
      validatedCount: validatedVehicles.length,
      leadId: leadId || 'none',
      hasPreferences: !!leadPreferences,
      removedArtificialLimit: true
    });

    // Return comprehensive validation result with ACTUAL counts
    return {
      hasRealInventory: validatedVehicles.length > 0,
      actualVehicles: validatedVehicles, // Return ALL matching vehicles, not limited to 20
      totalChecked: inventory?.length || 0,
      validatedCount: validatedVehicles.length,
      searchCriteria: leadPreferences || { rawInterest: cleanInterest },
      strictMode: true,
      warning: validatedVehicles.length === 0 ? 'no_validated_inventory' : null
    };

  } catch (error) {
    console.error('❌ Error in strict inventory validation:', error);
    return { hasRealInventory: false, actualVehicles: [], warning: 'inventory_check_failed' };
  }
};

// Get current business hours status
export const getBusinessHoursStatus = async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return { isOpen: true, hours: { start: '08:00', end: '19:00', timezone: 'America/New_York' } };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Default hours if no business_hours table
    const hours = { start: '08:00', end: '19:00', timezone: 'America/New_York' };

    // Check if currently within business hours
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", { timeZone: hours.timezone }));
    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMin] = hours.start.split(':').map(Number);
    const [endHour, endMin] = hours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    const isOpen = currentTime >= startTime && currentTime <= endTime;

    console.log(`🕒 Business hours check: ${isOpen ? 'OPEN' : 'CLOSED'} (${hours.start}-${hours.end} ${hours.timezone})`);

    return { isOpen, hours, currentTime: localTime };

  } catch (error) {
    console.error('Error checking business hours:', error);
    return { isOpen: true, hours: { start: '08:00', end: '19:00', timezone: 'America/New_York' } };
  }
};
