
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

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

// Enhanced vehicle parsing optimized for Jason Pilger Chevrolet format
function parseVehicleFromContent(data: ScrapedData): VehicleData | null {
  try {
    const content = data.markdown || data.content;
    const url = data.url;
    
    console.log('Parsing vehicle from URL:', url);
    console.log('Content preview:', content.slice(0, 500));
    
    // Enhanced vehicle detection for this specific dealer format
    // Look for "Used YYYY Make Model" or "New YYYY Make Model" patterns
    const vehicleHeaderPattern = /(?:Used|New)\s+(\d{4})\s+([A-Za-z]+)\s*([A-Za-z\s]+?)(?:\s|$)/i;
    const headerMatch = content.match(vehicleHeaderPattern);
    
    let year, make, model;
    if (headerMatch) {
      year = parseInt(headerMatch[1]);
      make = headerMatch[2];
      model = headerMatch[3].trim();
      console.log('Found vehicle header:', { year, make, model });
    }
    
    // Enhanced price detection for this dealer's format
    const pricePatterns = [
      /\$[\d,]+/g,
      /Price[:\s]*\$?([\d,]+)/i,
      /MSRP[:\s]*\$?([\d,]+)/i
    ];
    
    let price = null;
    for (const pattern of pricePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const prices = matches.map(m => {
          const numStr = m.replace(/[$,]/g, '');
          return parseInt(numStr);
        }).filter(p => p >= 5000 && p <= 200000); // Reasonable car price range
        
        if (prices.length > 0) {
          price = Math.max(...prices); // Take the highest reasonable price
          break;
        }
      }
    }
    
    // Enhanced VIN detection
    const vinPattern = /VIN[:\s]*([A-HJ-NPR-Z0-9]{17})/i;
    const vinMatch = content.match(vinPattern);
    const vin = vinMatch ? vinMatch[1] : null;
    
    // Enhanced stock number detection for this dealer's format
    const stockPatterns = [
      /Stock\s*Number[:\s]*([A-Za-z0-9]+)/i,
      /Stock[:\s#]*([A-Za-z0-9]+)/i,
      /Stk[:\s#]*([A-Za-z0-9]+)/i
    ];
    
    let stockNumber = null;
    for (const pattern of stockPatterns) {
      const stockMatch = content.match(pattern);
      if (stockMatch) {
        stockNumber = stockMatch[1];
        break;
      }
    }
    
    // Enhanced mileage detection
    const mileagePatterns = [
      /Odometer[:\s]*(\d+(?:,\d+)?)\s*miles?/i,
      /(\d+(?:,\d+)?)\s*miles?/i
    ];
    
    let mileage = null;
    for (const pattern of mileagePatterns) {
      const mileageMatch = content.match(pattern);
      if (mileageMatch) {
        const miles = parseInt(mileageMatch[1].replace(/,/g, ''));
        if (miles >= 0 && miles <= 500000) { // Reasonable mileage range
          mileage = miles;
          break;
        }
      }
    }
    
    // Enhanced exterior color detection
    const colorPatterns = [
      /Exterior Color[:\s]*([A-Za-z\s]+?)(?:\n|Interior|$)/i,
      /Color[:\s]*([A-Za-z\s]+?)(?:\n|Interior|$)/i
    ];
    
    let exteriorColor = null;
    for (const pattern of colorPatterns) {
      const colorMatch = content.match(pattern);
      if (colorMatch) {
        exteriorColor = colorMatch[1].trim();
        break;
      }
    }
    
    // Determine condition based on URL and content
    const isUsed = url.includes('/used/') || /\bused\b/i.test(content);
    const isNew = url.includes('/new/') || /\bnew\b/i.test(content);
    const condition = isUsed ? 'used' : isNew ? 'new' : 'used';
    
    // Extract features from the content
    const features = extractDealerFeatures(content);
    
    // Extract images
    const images = extractImageUrls(content);
    
    const vehicle: VehicleData = {
      make: make || 'Unknown',
      model: model || 'Unknown',
      year: year || null,
      price: price || null,
      vin: vin,
      stock_number: stockNumber,
      mileage: mileage,
      color_exterior: exteriorColor,
      condition: condition,
      description: content.slice(0, 1000), // First 1000 characters as description
      features: features,
      images: images
    };
    
    // Enhanced validation - require at least basic vehicle info
    const hasBasicInfo = (vehicle.make && vehicle.make !== 'Unknown') || 
                         (vehicle.model && vehicle.model !== 'Unknown') || 
                         vehicle.year || 
                         vehicle.vin || 
                         vehicle.stock_number ||
                         vehicle.price;
    
    if (hasBasicInfo) {
      console.log('✅ Successfully parsed vehicle:', {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        condition: vehicle.condition,
        stock_number: vehicle.stock_number,
        vin: vehicle.vin,
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

function extractDealerFeatures(content: string): string[] {
  const features: string[] = [];
  const featurePatterns = [
    // Drivetrain and transmission
    /4WD|AWD|FWD|RWD|Front-wheel Drive|All-wheel Drive|Four-wheel Drive/gi,
    /Automatic|Manual|CVT|Transmission/gi,
    
    // Interior features
    /Leather|Cloth|Heated Seats|Cooled Seats|Memory Seat|Power Seat/gi,
    /Sunroof|Moonroof|Panoramic/gi,
    /Navigation|GPS|IntelliLink/gi,
    /Bluetooth|Hands-free/gi,
    /Air Conditioning|Climate Control|Dual Zone/gi,
    
    // Safety and convenience
    /Backup Camera|Rear Camera|Rearview Camera|Side Blind Zone Alert/gi,
    /Cruise Control|Adaptive Cruise/gi,
    /Power Windows|Power Locks|Keyless Entry|Remote Start/gi,
    /Forward Collision Alert|Lane Departure Warning|Cross Traffic Alert/gi,
    
    // Audio and entertainment
    /Bose|Premium Audio|AM\/FM|Satellite Radio|SiriusXM|MP3/gi,
    /USB|Audio System|Speakers/gi,
    
    // Exterior features
    /Alloy Wheels|Power Liftgate|Trailer Hitch|Running Boards/gi,
    /LED|HID|Articulating Headlights|Fog Lights/gi
  ];
  
  featurePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      features.push(...matches.map(m => m.trim()));
    }
  });
  
  return [...new Set(features)].slice(0, 25); // Limit to 25 features, remove duplicates
}

function extractImageUrls(content: string): string[] {
  const imagePatterns = [
    /https?:\/\/pictures\.dealer\.com[^\s"']+\.jpg[^?\s"']*/gi,
    /https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|gif|webp)/gi
  ];
  
  const images: string[] = [];
  imagePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      images.push(...matches);
    }
  });
  
  return [...new Set(images)].slice(0, 15); // Limit to 15 images, remove duplicates
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
        upload_type: 'inventory',
        stored_filename: `scrape_${Date.now()}.json`
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
          price: vehicleRecord.price,
          stock_number: vehicleRecord.stock_number
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
        successful_imports: processedCount,
        failed_imports: skippedCount
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
