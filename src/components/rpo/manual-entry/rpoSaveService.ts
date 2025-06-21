
import { supabase } from '@/integrations/supabase/client';

interface DetectedMapping {
  rpo_code: string;
  description: string;
  category?: string;
  feature_type?: string;
  mapped_value?: string;
  confidence: number;
}

export const saveMappingsToDatabase = async (
  mappings: DetectedMapping[],
  sessionName: string,
  pastedData: string
) => {
  // Save learning session
  const { data: session, error: sessionError } = await supabase
    .from('rpo_learning_sessions')
    .insert({
      session_name: sessionName || `RPO Session ${new Date().toLocaleDateString()}`,
      source_data: pastedData,
      processed_mappings: mappings as any,
      notes: `Processed ${mappings.length} RPO codes`
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // Save each RPO mapping
  const savePromises = mappings.map(mapping => 
    supabase.rpc('upsert_rpo_intelligence', {
      p_rpo_code: mapping.rpo_code,
      p_category: mapping.category,
      p_description: mapping.description,
      p_feature_type: mapping.feature_type,
      p_mapped_value: mapping.mapped_value,
      p_confidence_score: mapping.confidence,
      p_vehicle_makes: ['Chevrolet'], // Default to Chevrolet for now
      p_model_years: null
    })
  );

  await Promise.all(savePromises);
  return session;
};
