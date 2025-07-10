import { Badge } from "@/components/ui/badge";
import { InventoryFieldMapping } from './types';

interface InventoryFieldMappingRowProps {
  fieldKey: keyof InventoryFieldMapping;
  label: string;
  required?: boolean;
  description?: string;
  mapping: InventoryFieldMapping;
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingChange: (key: keyof InventoryFieldMapping, value: string) => void;
}

const InventoryFieldMappingRow = ({
  fieldKey,
  label,
  required,
  description,
  mapping,
  csvHeaders,
  sampleData,
  onMappingChange
}: InventoryFieldMappingRowProps) => {
  const getSampleValue = (fieldKey: keyof InventoryFieldMapping): string => {
    const headerName = mapping[fieldKey];
    if (!headerName || !sampleData) {
      return '';
    }
    
    const value = sampleData[headerName];
    return value || '';
  };

  const isAutoDetected = (fieldKey: keyof InventoryFieldMapping): boolean => {
    return !!mapping[fieldKey];
  };

  const sampleValue = getSampleValue(fieldKey);

  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center space-x-2">
        <span>{label}</span>
        {required && (
          <Badge variant="destructive" className="text-xs">Required</Badge>
        )}
        {isAutoDetected(fieldKey) && (
          <Badge variant="secondary" className="text-xs">Auto-detected</Badge>
        )}
      </label>
      
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
      )}
      
      <select
        value={mapping[fieldKey] || ''}
        onChange={(e) => onMappingChange(fieldKey, e.target.value)}
        className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
      >
        <option value="">Select field...</option>
        {csvHeaders.map(header => (
          <option key={header} value={header}>{header}</option>
        ))}
      </select>
      
      {sampleValue && (
        <p className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-1 rounded truncate">
          Sample: {sampleValue}
        </p>
      )}
    </div>
  );
};

export default InventoryFieldMappingRow;