
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import RPODataInput from './manual-entry/RPODataInput';
import RPOMappingsList from './manual-entry/RPOMappingsList';
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
  const { toast } = useToast();

  const categories = [
    'engine', 'transmission', 'interior', 'exterior', 'package', 'option', 'safety', 'technology'
  ];

  const featureTypes = [
    'color', 'trim_level', 'engine_option', 'package_feature', 'safety_feature', 'technology_feature', 'accessory'
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

  return (
    <div className="space-y-6">
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
        categories={categories}
        featureTypes={featureTypes}
      />
    </div>
  );
};

export default RPOManualEntry;
