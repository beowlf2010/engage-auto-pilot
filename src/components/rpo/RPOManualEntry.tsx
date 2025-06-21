
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Clipboard, Brain, Save, Trash2 } from 'lucide-react';

interface DetectedMapping {
  rpo_code: string;
  description: string;
  category?: string;
  feature_type?: string;
  mapped_value?: string;
  confidence: number;
}

const RPOManualEntry = () => {
  const [pastedData, setPastedData] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [detectedMappings, setDetectedMappings] = useState<DetectedMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const categories = [
    'engine', 'transmission', 'interior', 'exterior', 'package', 'option', 'safety', 'technology'
  ];

  const featureTypes = [
    'color', 'trim_level', 'engine_option', 'package_feature', 'safety_feature', 'technology_feature', 'accessory'
  ];

  const processOrderData = () => {
    if (!pastedData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste some order screen data first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Parse the pasted data for RPO codes and descriptions
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
      const uniqueMappings = mappings.filter((mapping, index, self) => 
        index === self.findIndex(m => m.rpo_code === mapping.rpo_code)
      );

      setDetectedMappings(uniqueMappings);
      
      toast({
        title: "Data Processed",
        description: `Detected ${uniqueMappings.length} RPO codes from your pasted data.`,
      });
      
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process the pasted data. Please check the format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateMapping = (index: number, field: keyof DetectedMapping, value: string) => {
    const updated = [...detectedMappings];
    updated[index] = { ...updated[index], [field]: value };
    setDetectedMappings(updated);
  };

  const removeMapping = (index: number) => {
    const updated = detectedMappings.filter((_, i) => i !== index);
    setDetectedMappings(updated);
  };

  const saveMappings = async () => {
    if (detectedMappings.length === 0) {
      toast({
        title: "No Mappings",
        description: "Please process some data first.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Save learning session
      const { data: session, error: sessionError } = await supabase
        .from('rpo_learning_sessions')
        .insert({
          session_name: sessionName || `RPO Session ${new Date().toLocaleDateString()}`,
          source_data: pastedData,
          processed_mappings: detectedMappings as any,
          notes: `Processed ${detectedMappings.length} RPO codes`
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Save each RPO mapping
      const savePromises = detectedMappings.map(mapping => 
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

      toast({
        title: "Success!",
        description: `Saved ${detectedMappings.length} RPO mappings to the intelligence database.`,
      });

      // Clear the form
      setPastedData('');
      setDetectedMappings([]);
      setSessionName('');

    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: "Save Error",
        description: "Failed to save RPO mappings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clipboard className="h-5 w-5" />
            <span>Paste Order Screen Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name (Optional)</Label>
            <Input
              id="session-name"
              placeholder="e.g., 2024 Silverado Order Data"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="order-data">Order Screen Data</Label>
            <Textarea
              id="order-data"
              placeholder="Paste your order screen data here...
Example:
VIN: 1GCUDGED7NZ123456
Stock: C12345
RPO: L84 GU6 H0Y Z71 KC4
Description: 5.3L EcoTec3 V8 Engine, 3.42 Rear Axle, Jet Black Leather..."
              rows={8}
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
            />
          </div>

          <Button 
            onClick={processOrderData} 
            disabled={isProcessing || !pastedData.trim()}
            className="w-full"
          >
            <Brain className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Process RPO Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Detected Mappings */}
      {detectedMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected RPO Mappings ({detectedMappings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detectedMappings.map((mapping, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="font-mono">
                        {mapping.rpo_code}
                      </Badge>
                      <Badge variant="secondary">
                        Confidence: {Math.round(mapping.confidence * 100)}%
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={mapping.description}
                        onChange={(e) => updateMapping(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mapped Value</Label>
                      <Input
                        value={mapping.mapped_value || ''}
                        onChange={(e) => updateMapping(index, 'mapped_value', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select 
                        value={mapping.category} 
                        onValueChange={(value) => updateMapping(index, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Feature Type</Label>
                      <Select 
                        value={mapping.feature_type} 
                        onValueChange={(value) => updateMapping(index, 'feature_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select feature type" />
                        </SelectTrigger>
                        <SelectContent>
                          {featureTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              <Button 
                onClick={saveMappings} 
                disabled={isSaving}
                className="w-full"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : `Save ${detectedMappings.length} RPO Mappings`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RPOManualEntry;
