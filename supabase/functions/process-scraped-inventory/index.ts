
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VehicleData {
  make?: string;
  model?: string;
  year?: number;
  price?: number;
  vin?: string;
  stock_number?: string;
  trim?: string;
  mileage?: number;
  color_exterior?: string;
  condition?: 'new' | 'used' | 'certified';
  images?: string[];
  description?: string;
  features?: string[];
}

interface ScrapedData {
  url: string;
  content: string;
  markdown: string;
  metadata?: any;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Extract vehicle information from scraped content
function parseVehicleFromContent(data: ScrapedData): VehicleData | null {
  try {
    const content = data.markdown || data.content;
    const url = data.url;
    
    console.log('Parsing vehicle from URL:', url);
    
    // Extract vehicle details using regex patterns
    const makeMatch = content.match(/(?:Make|Brand):\s*([A-Za-z]+)/i) || 
                     content.match(/Chevrolet|Chevy|GMC|Buick|Cadillac/i);
    
    const modelMatch = content.match(/(?:Model):\s*([A-Za-z0-9\s]+)/i) ||
                      content.match(/(?:Silverado|Tahoe|Suburban|Equinox|Traverse|Malibu|Camaro|Corvette)/i);
    
    const yearMatch = content.match(/(?:Year|Model Year):\s*(\d{4})/i) ||
                     content.match(/\b(20\d{2})\b/);
    
    const priceMatch = content.match(/\$[\d,]+/g);
    const vinMatch = content.match(/VIN[:\s]*([A-HJ-NPR-Z0-9]{17})/i);
    const stockMatch = content.match(/(?:Stock|Stk)[#\s]*([A-Za-z0-9]+)/i);
    const mileageMatch = content.match(/(\d+(?:,\d+)?)\s*(?:miles?|mi)/i);
    
    // Determine if it's new or used
    const isNew = /\bnew\b/i.test(content) || /\b0\s*miles?\b/i.test(content);
    const isUsed = /\bused\b/i.test(content) || /\bpre-owned\b/i.test(content);
    
    const vehicle: VehicleData = {
      make: makeMatch ? (Array.isArray(makeMatch) ? makeMatch[0] : makeMatch[1] || makeMatch[0]) : 'Chevrolet',
      model: modelMatch ? (Array.isArray(modelMatch) ? modelMatch[0] : modelMatch[1] || modelMatch[0]) : undefined,
      year: yearMatch ? parseInt(yearMatch[1] || yearMatch[0]) : undefined,
      price: priceMatch ? parseFloat(priceMatch[priceMatch.length - 1].replace(/[$,]/g, '')) : undefined,
      vin: vinMatch ? vinMatch[1] : undefined,
      stock_number: stockMatch ? stockMatch[1] : undefined,
      mileage: mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : undefined,
      condition: isNew ? 'new' : isUsed ? 'used' : 'new',
      description: content.slice(0, 500), // First 500 characters as description
      features: extractFeatures(content),
      images: extractImageUrls(content)
    };
    
    // Only return if we have basic vehicle info
    if (vehicle.make && (vehicle.model || vehicle.year)) {
      console.log('Successfully parsed vehicle:', vehicle);
      return vehicle;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing vehicle data:', error);
    return null;
  }
}

function extractFeatures(content: string): string[] {
  const features: string[] = [];
  const featurePatterns = [
    /4WD|AWD|FWD|RWD/gi,
    /automatic|manual|transmission/gi,
    /leather|cloth|heated seats/gi,
    /sunroof|moonroof/gi,
    /navigation|GPS/gi,
    /bluetooth|hands-free/gi,
    /backup camera|rear camera/gi,
    /cruise control/gi,
    /air conditioning|A\/C/gi
  ];
  
  featurePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      features.push(...matches.map(m => m.trim()));
    }
  });
  
  return [...new Set(features)]; // Remove duplicates
}

function extractImageUrls(content: string): string[] {
  const imagePatterns = [
    /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/gi,
    /src="([^"]+\.(?:jpg|jpeg|png|gif|webp))"/gi
  ];
  
  const images: string[] = [];
  imagePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      images.push(...matches);
    }
  });
  
  return [...new Set(images)]; // Remove duplicates
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scrapedData, userId } = await req.json();
    
    if (!scrapedData || !Array.isArray(scrapedData.data)) {
      return new Response(
        JSON.stringify({ error: 'Invalid scraped data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${scrapedData.data.length} scraped pages`);
    
    // Create upload history record
    const { data: uploadHistory, error: uploadError } = await supabase
      .from('upload_history')
      .insert({
        user_id: userId,
        file_name: 'Website Scrape - Jason Pilger Chevrolet',
        file_size: JSON.stringify(scrapedData).length,
        source_type: 'website_scrape',
        processing_status: 'processing'
      })
      .select()
      .single();

    if (uploadError) {
      throw uploadError;
    }

    const vehicles: any[] = [];
    let processedCount = 0;
    let skippedCount = 0;

    // Process each scraped page
    for (const page of scrapedData.data) {
      const vehicleData = parseVehicleFromContent(page);
      
      if (vehicleData) {
        // Prepare vehicle record for database
        const vehicleRecord = {
          make: vehicleData.make,
          model: vehicleData.model || 'Unknown',
          year: vehicleData.year,
          price: vehicleData.price,
          vin: vehicleData.vin,
          stock_number: vehicleData.stock_number,
          trim: vehicleData.trim,
          mileage: vehicleData.mileage,
          color_exterior: vehicleData.color_exterior,
          condition: vehicleData.condition,
          status: 'available',
          source_report: 'website_scrape',
          description: vehicleData.description,
          features: vehicleData.features,
          images: vehicleData.images,
          upload_history_id: uploadHistory.id,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        };
        
        vehicles.push(vehicleRecord);
        processedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`Processed: ${processedCount}, Skipped: ${skippedCount}`);

    // Insert vehicles into database
    if (vehicles.length > 0) {
      const { error: insertError } = await supabase
        .from('inventory')
        .insert(vehicles);

      if (insertError) {
        throw insertError;
      }
    }

    // Update upload history
    await supabase
      .from('upload_history')
      .update({
        processing_status: 'completed',
        total_records: processedCount,
        successful_records: processedCount,
        failed_records: skippedCount
      })
      .eq('id', uploadHistory.id);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        skippedCount,
        uploadHistoryId: uploadHistory.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing scraped inventory:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
