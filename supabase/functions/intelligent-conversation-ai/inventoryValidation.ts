
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Enhanced inventory validation to prevent AI from claiming non-existent vehicles
export const validateInventoryAccuracy = async (vehicleInterest: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return { hasRealInventory: false, actualVehicles: [], warning: 'inventory_check_failed' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const cleanInterest = vehicleInterest.toLowerCase().trim();
    console.log('🔍 Validating inventory for:', cleanInterest);

    // Check for electric/hybrid vehicles specifically
    const isEVRequest = /\b(electric|ev|hybrid|tesla|bolt|leaf|prius|model|plug-in)\b/i.test(cleanInterest);
    
    if (isEVRequest) {
      // Get actual electric/hybrid vehicles in inventory
      const { data: evInventory, error } = await supabase
        .from('inventory')
        .select('id, make, model, year, fuel_type, condition, price, status')
        .eq('status', 'available')
        .or('fuel_type.eq.Electric,fuel_type.eq.Hybrid,fuel_type.eq.Plug-in Hybrid')
        .limit(10);

      if (error) {
        console.error('Error checking EV inventory:', error);
        return { hasRealInventory: false, actualVehicles: [], warning: 'inventory_check_failed' };
      }

      console.log('📊 Found EV/Hybrid inventory:', evInventory?.length || 0, 'vehicles');
      
      return {
        hasRealInventory: evInventory && evInventory.length > 0,
        actualVehicles: evInventory || [],
        isEVRequest: true,
        warning: evInventory && evInventory.length === 0 ? 'no_evs_available' : null
      };
    }

    // For non-EV requests, check for specific makes
    const makeMatch = cleanInterest.match(/\b(chevrolet|chevy|ford|toyota|honda|bmw|mercedes|audi|nissan|hyundai)\b/i);
    
    if (makeMatch) {
      const make = makeMatch[1].toLowerCase();
      const { data: inventory, error } = await supabase
        .from('inventory')
        .select('id, make, model, year, fuel_type, condition, price, status')
        .eq('status', 'available')
        .ilike('make', `%${make}%`)
        .limit(10);

      if (error) {
        console.error('Error checking inventory for make:', make, error);
        return { hasRealInventory: false, actualVehicles: [], warning: 'inventory_check_failed' };
      }

      console.log(`📊 Found ${make} inventory:`, inventory?.length || 0, 'vehicles');
      
      return {
        hasRealInventory: inventory && inventory.length > 0,
        actualVehicles: inventory || [],
        requestedMake: make,
        warning: inventory && inventory.length === 0 ? 'no_make_available' : null
      };
    }

    // General inventory check
    const { data: generalInventory, error } = await supabase
      .from('inventory')
      .select('id, make, model, year, fuel_type, condition, price, status')
      .eq('status', 'available')
      .limit(20);

    if (error) {
      console.error('Error checking general inventory:', error);
      return { hasRealInventory: false, actualVehicles: [], warning: 'inventory_check_failed' };
    }

    return {
      hasRealInventory: generalInventory && generalInventory.length > 0,
      actualVehicles: generalInventory || [],
      warning: generalInventory && generalInventory.length === 0 ? 'no_inventory_available' : null
    };

  } catch (error) {
    console.error('Error in inventory validation:', error);
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
    // @ts-expect-error business_hours table might not be in types yet
    const { data: businessHours } = await (supabase.from('business_hours') as any)
      .select('weekday_start, weekday_end, timezone')
      .limit(1)
      .single();

    const hours = businessHours ? {
      start: businessHours.weekday_start || '08:00',
      end: businessHours.weekday_end || '19:00',
      timezone: businessHours.timezone || 'America/New_York'
    } : { start: '08:00', end: '19:00', timezone: 'America/New_York' };

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
