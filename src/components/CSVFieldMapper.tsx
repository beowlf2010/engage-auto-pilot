
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";
import { FieldMapping } from './csv-mapper/types';
import { fieldSections } from './csv-mapper/fieldMappingConfig';
import { performAutoDetection } from './csv-mapper/fieldMappingUtils';
import FieldSection from './csv-mapper/FieldSection';

interface CSVFieldMapperProps {
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingComplete: (mapping: FieldMapping) => void;
}

const CSVFieldMapper = ({ csvHeaders, sampleData, onMappingComplete }: CSVFieldMapperProps) => {
  const [mapping, setMapping] = useState<FieldMapping>({
    firstName: '',
    lastName: ''
  });

  // Auto-detect common field mappings
  useEffect(() => {
    console.log('Sample data in CSVFieldMapper:', sampleData);
    const autoMapping = performAutoDetection(csvHeaders);
    setMapping(autoMapping);
  }, [csvHeaders]);

  const requiredFields = ['firstName', 'lastName'];
  const isValid = requiredFields.every(field => mapping[field as keyof FieldMapping]);

  const handleMappingChange = (key: keyof FieldMapping, value: string) => {
    setMapping({ ...mapping, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Map CSV Fields</span>
          {isValid ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </CardTitle>
        <p className="text-sm text-slate-600">
          {Object.values(mapping).filter(value => value).length} of {csvHeaders.length} fields auto-detected
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
            onClick={() => onMappingComplete(mapping)}
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
