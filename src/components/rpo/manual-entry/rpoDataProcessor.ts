
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
    // Look for RPO code patterns (typically 3-4 character alphanumeric codes)
    const rpoMatches = line.match(/\b[A-Z0-9]{3,4}\b/g);
    
    if (rpoMatches) {
      rpoMatches.forEach(rpo => {
        // Skip common non-RPO codes
        if (['VIN', 'MSRP', 'STOCK'].includes(rpo)) return;
        
        // Try to extract description from the same line
        const description = line.replace(new RegExp(`\\b${rpo}\\b`, 'g'), '').trim();
        
        // Auto-categorize based on common patterns
        let category = 'option';
        let feature_type = 'accessory';
        
        if (description.toLowerCase().includes('engine') || description.toLowerCase().includes('v8') || description.toLowerCase().includes('v6')) {
          category = 'engine';
          feature_type = 'engine_option';
        } else if (description.toLowerCase().includes('transmission') || description.toLowerCase().includes('automatic')) {
          category = 'transmission';
          feature_type = 'transmission_option';
        } else if (description.toLowerCase().includes('interior') || description.toLowerCase().includes('leather') || description.toLowerCase().includes('cloth')) {
          category = 'interior';
          feature_type = 'trim_level';
        } else if (description.toLowerCase().includes('paint') || description.toLowerCase().includes('color') || description.toLowerCase().includes('metallic')) {
          category = 'exterior';
          feature_type = 'color';
        } else if (description.toLowerCase().includes('package') || description.toLowerCase().includes('pkg')) {
          category = 'package';
          feature_type = 'package_feature';
        }
        
        mappings.push({
          rpo_code: rpo,
          description: description || `RPO Code ${rpo}`,
          category,
          feature_type,
          mapped_value: description,
          confidence: description ? 0.8 : 0.5
        });
      });
    }
  });

  // Remove duplicates
  return mappings.filter((mapping, index, self) => 
    index === self.findIndex(m => m.rpo_code === mapping.rpo_code)
  );
};
