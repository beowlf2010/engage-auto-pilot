
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

// Enhanced vehicle parsing with better regex patterns
function parseVehicleFromContent(data: ScrapedData): VehicleData | null {
  try {
    const content = data.markdown || data.content;
    const url = data.url;
    
    console.log('Parsing vehicle from URL:', url);
    console.log('Content preview:', content.slice(0, 500));
    
    // Enhanced make detection - look for Chevrolet specifically and common variations
    const makePatterns = [
      /(?:Make|Brand):\s*([A-Za-z]+)/i,
      /\b(Chevrolet|Chevy|GMC|Buick|Cadillac)\b/i,
      /Jason Pilger (Chevrolet)/i
    ];
    
    let makeMatch = null;
    for (const pattern of makePatterns) {
      makeMatch = content.match(pattern);
      if (makeMatch) break;
    }
    
    // Enhanced model detection with more specific patterns
    const modelPatterns = [
      /(?:Model|Vehicle):\s*([A-Za-z0-9\s]+)/i,
      /\b(Silverado|Tahoe|Suburban|Equinox|Traverse|Malibu|Camaro|Corvette|Trailblazer|Colorado|Blazer|Express)\b/i,
      /(?:New|Used)\s+([A-Za-z0-9\s]+)\s+(?:for sale|available)/i
    ];
    
    let modelMatch = null;
    for (const pattern of modelPatterns) {
      modelMatch = content.match(pattern);
      if (modelMatch) break;
    }
    
    // Enhanced year detection
    const yearPatterns = [
      /(?:Year|Model Year):\s*(\d{4})/i,
      /\b(20\d{2})\b/g, // Get all 4-digit years
      /(?:New|Used)\s+(\d{4})/i
    ];
    
    let yearMatch = null;
    for (const pattern of yearPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Find the most recent reasonable year
        const years = matches.map(m => parseInt(m.match(/\d{4}/)?.[0] || '0'))
          .filter(y => y >= 2020 && y <= 2025);
        if (years.length > 0) {
          yearMatch = [years[0].toString()];
          break;
        }
      }
    }
    
    // Enhanced price detection
    const pricePatterns = [
      /\$[\d,]+(?:\.\d{2})?/g,
      /Price:\s*\$?([\d,]+)/i,
      /MSRP:\s*\$?([\d,]+)/i
    ];
    
    let priceMatch = null;
    for (const pattern of pricePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Find the highest reasonable price (likely the main price)
        const prices = matches.map(m => {
          const numStr = m.replace(/[$,]/g, '');
          return parseInt(numStr);
        }).filter(p => p >= 15000 && p <= 200000); // Reasonable car price range
        
        if (prices.length > 0) {
          priceMatch = ['$' + Math.max(...prices).toLocaleString()];
          break;
        }
      }
    }
    
    // Enhanced VIN detection
    const vinMatch = content.match(/VIN[:\s]*([A-HJ-NPR-Z0-9]{17})/i);
    
    // Enhanced stock number detection
    const stockPatterns = [
      /(?:Stock|Stk)[#\s]*([A-Za-z0-9]+)/i,
      /Stock Number:\s*([A-Za-z0-9]+)/i
    ];
    
    let stockMatch = null;
    for (const pattern of stockPatterns) {
      stockMatch = content.match(pattern);
      if (stockMatch) break;
    }
    
    // Enhanced mileage detection
    const mileagePatterns = [
      /(\d+(?:,\d+)?)\s*(?:miles?|mi)/i,
      /Mileage:\s*(\d+(?:,\d+)?)/i
    ];
    
    let mileageMatch = null;
    for (const pattern of mileagePatterns) {
      mileageMatch = content.match(pattern);
      if (mileageMatch) break;
    }
    
    // Determine condition with better logic
    const isNew = /\bnew\b/i.test(content) || 
                  /\b0\s*miles?\b/i.test(content) ||
                  url.includes('new-inventory') ||
                  (mileageMatch && parseInt(mileageMatch[1].replace(/,/g, '')) < 100);
    
    const isUsed = /\bused\b/i.test(content) || 
                   /\bpre-owned\b/i.test(content) ||
                   url.includes('used-inventory');
    
    const vehicle: VehicleData = {
      make: makeMatch ? (Array.isArray(makeMatch) ? makeMatch[1] || makeMatch[0] : makeMatch[1] || makeMatch[0]) : 'Chevrolet',
      model: modelMatch ? (Array.isArray(modelMatch) ? modelMatch[1] || modelMatch[0] : modelMatch[1] || modelMatch[0]) : undefined,
      year: yearMatch ? parseInt(yearMatch[0]) : undefined,
      price: priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, '')) : undefined,
      vin: vinMatch ? vinMatch[1] : undefined,
      stock_number: stockMatch ? stockMatch[1] : undefined,
      mileage: mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : undefined,
      condition: isNew ? 'new' : isUsed ? 'used' : 'new',
      description: content.slice(0, 500), // First 500 characters as description
      features: extractFeatures(content),
      images: extractImageUrls(content)
    };
    
    // Enhanced validation - require at least make and one other identifying field
    const hasBasicInfo = vehicle.make && (
      vehicle.model || 
      vehicle.year || 
      vehicle.vin || 
      vehicle.stock_number ||
      vehicle.price
    );
    
    if (hasBasicInfo) {
      console.log('✅ Successfully parsed vehicle:', {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        condition: vehicle.condition,
        url: url
      });
      return vehicle;
    } else {
      console.log('❌ Insufficient vehicle data found:', {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        url: url
      });
      return null;
    }
    
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
    /backup camera|rear camera|rearview camera/gi,
    /cruise control/gi,
    /air conditioning|A\/C|climate control/gi,
    /power windows|power locks/gi,
    /remote start/gi,
    /keyless entry/gi
  ];
  
  featurePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      features.push(...matches.map(m => m.trim()));
    }
  });
  
  return [...new Set(features)].slice(0, 20); // Limit to 20 features, remove duplicates
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
  
  return [...new Set(images)].slice(0, 10); // Limit to 10 images, remove duplicates
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scrapedData, userId } = await req.json();
    
    if (!scrapedData || !Array.isArray(scrapedData.data)) {
      console.error('Invalid scraped data format:', scrapedData);
      return new Response(
        JSON.stringify({ error: 'Invalid scraped data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Processing ${scrapedData.data.length} scraped pages`);
    
    // Create upload history record with correct column names
    const { data: uploadHistory, error: uploadError } = await supabase
      .from('upload_history')
      .insert({
        user_id: userId,
        original_filename: 'Website Scrape - Jason Pilger Chevrolet',
        file_size: JSON.stringify(scrapedData).length,
        source_type: 'website_scrape',
        processing_status: 'processing',
        upload_type: 'inventory'
      })
      .select()
      .single();

    if (uploadError) {
      console.error('Failed to create upload history:', uploadError);
      throw uploadError;
    }

    console.log('✅ Upload history created:', uploadHistory.id);

    const vehicles: any[] = [];
    let processedCount = 0;
    let skippedCount = 0;

    // Process each scraped page
    for (const [index, page] of scrapedData.data.entries()) {
      console.log(`📄 Processing page ${index + 1}/${scrapedData.data.length}: ${page.url || 'Unknown URL'}`);
      
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
          description: vehicleData.description,
          features: vehicleData.features,
          images: vehicleData.images,
          upload_history_id: uploadHistory.id,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        };
        
        vehicles.push(vehicleRecord);
        processedCount++;
        console.log(`✅ Vehicle ${processedCount} prepared:`, {
          make: vehicleRecord.make,
          model: vehicleRecord.model,
          year: vehicleRecord.year,
          price: vehicleRecord.price
        });
      } else {
        skippedCount++;
        console.log(`⏭️ Skipped page ${index + 1} - no vehicle data found`);
      }
    }

    console.log(`📊 Processing summary: ${processedCount} vehicles found, ${skippedCount} pages skipped`);

    // Insert vehicles into database in batches
    if (vehicles.length > 0) {
      console.log(`💾 Inserting ${vehicles.length} vehicles into database...`);
      
      const batchSize = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < vehicles.length; i += batchSize) {
        const batch = vehicles.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('inventory')
          .insert(batch);

        if (insertError) {
          console.error(`Failed to insert batch ${Math.floor(i/batchSize) + 1}:`, insertError);
          throw insertError;
        }
        
        insertedCount += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${insertedCount}/${vehicles.length} vehicles`);
      }
    }

    // Update upload history with final results
    await supabase
      .from('upload_history')
      .update({
        processing_status: 'completed',
        total_records: processedCount,
        successful_records: processedCount,
        failed_records: skippedCount
      })
      .eq('id', uploadHistory.id);

    console.log('🎉 Processing completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        skippedCount,
        uploadHistoryId: uploadHistory.id,
        summary: {
          totalPagesProcessed: scrapedData.data.length,
          vehiclesFound: processedCount,
          pagesSkipped: skippedCount,
          successRate: Math.round((processedCount / scrapedData.data.length) * 100)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error processing scraped inventory:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
