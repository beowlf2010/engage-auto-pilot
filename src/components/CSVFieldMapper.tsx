
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Save } from "lucide-react";
import { FieldMapping } from './csv-mapper/types';
import { fieldSections } from './csv-mapper/fieldMappingConfig';
import { performAutoDetection } from './csv-mapper/fieldMappingUtils';
import FieldSection from './csv-mapper/FieldSection';
import { useMappingPersistence } from '@/hooks/useMappingPersistence';

interface CSVFieldMapperProps {
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingComplete: (mapping: FieldMapping) => void;
  csvText?: string; // Add CSV text for preview processing
  fileName?: string;
}

const CSVFieldMapper = ({ 
  csvHeaders, 
  sampleData, 
  onMappingComplete,
  csvText,
  fileName 
}: CSVFieldMapperProps) => {
  const [mapping, setMapping] = useState<FieldMapping>({
    firstName: '',
    lastName: ''
  });
  
  const { saveMapping, loadMapping, hasSavedMapping } = useMappingPersistence<FieldMapping>({
    storageKey: 'csv-field-mappings'
  });

  // Auto-detect or load saved mappings
  useEffect(() => {
    console.log('Sample data in CSVFieldMapper:', sampleData);
    
    // First try to load saved mapping for this CSV structure
    const savedMapping = loadMapping(csvHeaders);
    
    if (savedMapping) {
      console.log('📋 Using saved CSV mapping');
      setMapping(savedMapping);
    } else {
      console.log('🔍 No saved mapping found, auto-detecting');
      const autoMapping = performAutoDetection(csvHeaders);
      setMapping(autoMapping);
    }
  }, [csvHeaders, loadMapping]);

  // Validation: Either individual names OR combined client name
  const hasIndividualNames = mapping.firstName && mapping.lastName;
  const hasCombinedName = mapping.clientName;
  const isValid = hasIndividualNames || hasCombinedName;

  const handleMappingChange = (key: keyof FieldMapping, value: string) => {
    setMapping({ ...mapping, [key]: value });
  };

  const handleMappingComplete = () => {
    // Save the mapping for future use
    saveMapping(csvHeaders, mapping);
    onMappingComplete(mapping);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Map CSV Fields</span>
          {hasSavedMapping(csvHeaders) && <Save className="w-4 h-4 text-blue-500" />}
          {isValid ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </CardTitle>
        <p className="text-sm text-slate-600">
          {hasSavedMapping(csvHeaders) ? (
            <>Using saved mapping • {Object.values(mapping).filter(value => value).length} fields mapped</>
          ) : (
            <>{Object.values(mapping).filter(value => value).length} of {csvHeaders.length} fields auto-detected</>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {fieldSections.map((section) => (
          <FieldSection
            key={section.title}
            section={section}
            mapping={mapping}
            csvHeaders={csvHeaders}
            sampleData={sampleData}
            onMappingChange={handleMappingChange}
          />
        ))}

        <div className="pt-4 border-t">
          <Button 
            onClick={handleMappingComplete}
            disabled={!isValid}
            className="w-full"
          >
            Continue with Field Mapping ({Object.values(mapping).filter(value => value).length} fields mapped)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVFieldMapper;
