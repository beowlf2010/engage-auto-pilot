
interface DetectedMapping {
  rpo_code: string;
  description: string;
  category?: string;
  feature_type?: string;
  mapped_value?: string;
  confidence: number;
}

export const processOrderData = (pastedData: string): DetectedMapping[] => {
  const lines = pastedData.split('\n').filter(line => line.trim());
  const mappings: DetectedMapping[] = [];
  
  lines.forEach(line => {
    // Enhanced RPO code pattern matching for Chevrolet/GM codes
    const rpoMatches = line.match(/\b[A-Z0-9]{3,4}\b/g);
    
    if (rpoMatches) {
      rpoMatches.forEach(rpo => {
        // Skip common non-RPO codes
        if (['VIN', 'MSRP', 'STOCK', 'MPH', 'LED', 'USB', 'GPS'].includes(rpo)) return;
        
        // Extract description from the same line (everything after the RPO code and dash)
        const descriptionMatch = line.match(new RegExp(`${rpo}\\s*-\\s*(.+)`));
        const description = descriptionMatch ? descriptionMatch[1].trim() : `RPO Code ${rpo}`;
        
        // Enhanced auto-categorization with more specific patterns
        let category = 'additional_options'; // Default category
        let feature_type = 'accessory';
        let confidence = 0.7;
        
        const descLower = description.toLowerCase();
        
        // Engine and powertrain
        if (descLower.includes('engine') || descLower.includes('v8') || descLower.includes('v6') || 
            descLower.includes('turbo') || descLower.includes('diesel')) {
          category = 'engine';
          feature_type = 'engine_option';
          confidence = 0.9;
        }
        // Transmission
        else if (descLower.includes('transmission') || descLower.includes('automatic') || 
                 descLower.includes('manual')) {
          category = 'transmission';
          feature_type = 'transmission_option';
          confidence = 0.9;
        }
        // Interior features
        else if (descLower.includes('seat') || descLower.includes('interior') || 
                 descLower.includes('leather') || descLower.includes('cloth') ||
                 descLower.includes('console') || descLower.includes('carpet')) {
          category = 'interior';
          feature_type = 'comfort';
          confidence = 0.8;
        }
        // Exterior and paint
        else if (descLower.includes('paint') || descLower.includes('color') || 
                 descLower.includes('metallic') || descLower.includes('bumper') ||
                 descLower.includes('grille') || descLower.includes('mirror')) {
          category = 'exterior';
          feature_type = 'appearance';
          confidence = 0.8;
        }
        // Package detection (very important for GM vehicles)
        else if (descLower.includes('package') || descLower.includes('pkg') || 
                 descLower.includes('edition') || descLower.includes('trim')) {
          category = 'package';
          feature_type = 'package_feature';
          confidence = 0.9;
        }
        // Safety features
        else if (descLower.includes('brake') || descLower.includes('assist') || 
                 descLower.includes('alert') || descLower.includes('collision') ||
                 descLower.includes('airbag') || descLower.includes('safety')) {
          category = 'safety';
          feature_type = 'safety_feature';
          confidence = 0.8;
        }
        // Technology
        else if (descLower.includes('remote') || descLower.includes('keyless') || 
                 descLower.includes('bluetooth') || descLower.includes('navigation') ||
                 descLower.includes('display') || descLower.includes('camera') ||
                 descLower.includes('usb') || descLower.includes('wireless')) {
          category = 'technology';
          feature_type = 'technology_feature';
          confidence = 0.8;
        }
        // Climate control
        else if (descLower.includes('air conditioning') || descLower.includes('climate') || 
                 descLower.includes('heated') || descLower.includes('cooling') ||
                 descLower.includes('ventilated')) {
          category = 'climate';
          feature_type = 'comfort';
          confidence = 0.8;
        }
        // Lighting
        else if (descLower.includes('light') || descLower.includes('lamp') || 
                 descLower.includes('led') || descLower.includes('fog')) {
          category = 'lighting';
          feature_type = 'lighting_feature';
          confidence = 0.8;
        }
        // Towing and trailer equipment
        else if (descLower.includes('trailer') || descLower.includes('towing') || 
                 descLower.includes('hitch') || descLower.includes('tow')) {
          category = 'towing';
          feature_type = 'towing_equipment';
          confidence = 0.8;
        }
        // Performance features
        else if (descLower.includes('performance') || descLower.includes('sport') || 
                 descLower.includes('exhaust') || descLower.includes('suspension') ||
                 descLower.includes('differential')) {
          category = 'performance';
          feature_type = 'performance_upgrade';
          confidence = 0.8;
        }
        // Wheels and tires
        else if (descLower.includes('wheel') || descLower.includes('tire') || 
                 descLower.includes('rim')) {
          category = 'wheels_tires';
          feature_type = 'equipment';
          confidence = 0.8;
        }
        // Delete options
        else if (descLower.includes('delete') || descLower.includes('remove')) {
          feature_type = 'deletion';
          confidence = 0.7;
        }
        
        // If it's clearly an additional option/equipment, use higher confidence
        if (category === 'additional_options' && 
            (descLower.includes('equipment') || descLower.includes('option') || 
             descLower.includes('kit') || descLower.includes('system'))) {
          confidence = 0.8;
        }
        
        mappings.push({
          rpo_code: rpo,
          description: description,
          category,
          feature_type,
          mapped_value: description,
          confidence
        });
      });
    }
  });

  // Remove duplicates based on RPO code
  return mappings.filter((mapping, index, self) => 
    index === self.findIndex(m => m.rpo_code === mapping.rpo_code)
  );
};
