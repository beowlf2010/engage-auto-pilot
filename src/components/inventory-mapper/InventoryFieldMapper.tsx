import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Car } from "lucide-react";
import { InventoryFieldMapping } from './types';
import { inventoryFieldSections } from './inventoryFieldConfig';
import { performInventoryAutoDetection, validateInventoryMapping, transformInventoryData } from './inventoryFieldUtils';
import InventoryFieldSection from './InventoryFieldSection';

interface InventoryFieldMapperProps {
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingComplete: (mapping: InventoryFieldMapping, transformer: (row: Record<string, any>) => Record<string, any>) => void;
}

const InventoryFieldMapper = ({ csvHeaders, sampleData, onMappingComplete }: InventoryFieldMapperProps) => {
  const [mapping, setMapping] = useState<InventoryFieldMapping>({});

  // Auto-detect common field mappings
  useEffect(() => {
    console.log('🔍 [INVENTORY MAPPER] Sample data received:', sampleData);
    console.log('🔍 [INVENTORY MAPPER] Headers received:', csvHeaders);
    
    const autoMapping = performInventoryAutoDetection(csvHeaders);
    setMapping(autoMapping);
  }, [csvHeaders]);

  const { isValid, errors } = validateInventoryMapping(mapping);
  
  const handleMappingChange = (key: keyof InventoryFieldMapping, value: string) => {
    setMapping({ ...mapping, [key]: value });
  };

  const handleComplete = () => {
    // Create a transformer function that uses the current mapping
    const transformer = (row: Record<string, any>) => transformInventoryData(row, mapping);
    
    onMappingComplete(mapping, transformer);
  };

  // Count total mapped fields
  const totalMappedFields = Object.values(mapping).filter(value => value).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Car className="w-5 h-5" />
          <span>Map Inventory Fields</span>
          {isValid ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500" />
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalMappedFields} of {csvHeaders.length} fields auto-detected. Map your inventory data columns to the appropriate fields.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Show validation errors if any */}
        {errors.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h5 className="font-medium text-amber-800 mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Recommendations
            </h5>
            <ul className="text-sm text-amber-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Field sections */}
        {inventoryFieldSections.map((section) => (
          <InventoryFieldSection
            key={section.title}
            section={section}
            mapping={mapping}
            csvHeaders={csvHeaders}
            sampleData={sampleData}
            onMappingChange={handleMappingChange}
          />
        ))}

        {/* Continue button */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleComplete}
            className="w-full"
            size="lg"
          >
            Continue with Field Mapping ({totalMappedFields} fields mapped)
          </Button>
          
          {!isValid && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              You can continue even with recommendations - the system will do its best to process your data.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryFieldMapper;