
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import RPODataInput from './manual-entry/RPODataInput';
import RPOMappingsList from './manual-entry/RPOMappingsList';
import CategoryManager from './manual-entry/CategoryManager';
import { processOrderData } from './manual-entry/rpoDataProcessor';
import { saveMappingsToDatabase } from './manual-entry/rpoSaveService';

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
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const { toast } = useToast();

  // Enhanced categories to match order bank structure
  const defaultCategories = [
    'engine', 'transmission', 'interior', 'exterior', 'package', 'option', 
    'safety', 'technology', 'additional_options', 'performance', 'convenience',
    'appearance', 'protection', 'towing', 'off_road', 'comfort', 'lighting',
    'suspension', 'wheels_tires', 'audio', 'navigation', 'climate'
  ];

  // Combine default and custom categories
  const allCategories = [...defaultCategories, ...customCategories];

  const featureTypes = [
    'color', 'trim_level', 'engine_option', 'package_feature', 'safety_feature', 
    'technology_feature', 'accessory', 'equipment', 'upgrade', 'deletion',
    'performance_upgrade', 'convenience_feature', 'appearance_package',
    'protection_feature', 'towing_equipment', 'off_road_equipment'
  ];

  const handleProcessOrderData = () => {
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
      const mappings = processOrderData(pastedData);
      setDetectedMappings(mappings);
      
      toast({
        title: "Data Processed",
        description: `Detected ${mappings.length} RPO codes from your pasted data.`,
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

  const handleSaveMappings = async () => {
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
      await saveMappingsToDatabase(detectedMappings, sessionName, pastedData);

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

  const addCustomCategory = (categoryName: string) => {
    const sanitizedName = categoryName.toLowerCase().replace(/\s+/g, '_');
    if (!allCategories.includes(sanitizedName)) {
      setCustomCategories(prev => [...prev, sanitizedName]);
      toast({
        title: "Category Added",
        description: `Added "${categoryName}" to available categories.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <CategoryManager 
        categories={allCategories}
        onAddCategory={addCustomCategory}
      />

      <RPODataInput
        sessionName={sessionName}
        setSessionName={setSessionName}
        pastedData={pastedData}
        setPastedData={setPastedData}
        onProcess={handleProcessOrderData}
        isProcessing={isProcessing}
      />

      <RPOMappingsList
        mappings={detectedMappings}
        onUpdateMapping={updateMapping}
        onRemoveMapping={removeMapping}
        onSaveMappings={handleSaveMappings}
        isSaving={isSaving}
        categories={allCategories}
        featureTypes={featureTypes}
      />
    </div>
  );
};

export default RPOManualEntry;
