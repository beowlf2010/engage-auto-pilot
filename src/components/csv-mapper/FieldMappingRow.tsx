
import { Badge } from "@/components/ui/badge";
import { FieldMapping } from './types';

interface FieldMappingRowProps {
  fieldKey: keyof FieldMapping;
  label: string;
  required: boolean;
  mapping: FieldMapping;
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingChange: (key: keyof FieldMapping, value: string) => void;
}

const FieldMappingRow = ({
  fieldKey,
  label,
  required,
  mapping,
  csvHeaders,
  sampleData,
  onMappingChange
}: FieldMappingRowProps) => {
  const getSampleValue = (fieldKey: keyof FieldMapping): string => {
    const headerName = mapping[fieldKey];
    if (!headerName || !sampleData) {
      console.log(`No sample data for ${fieldKey}: headerName=${headerName}, sampleData exists=${!!sampleData}`);
      return '';
    }
    
    const value = sampleData[headerName];
    console.log(`Getting sample for ${fieldKey} (${headerName}):`, value);
    return value || '';
  };

  const isAutoDetected = (fieldKey: keyof FieldMapping): boolean => {
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
      <select
        value={mapping[fieldKey] || ''}
        onChange={(e) => onMappingChange(fieldKey, e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
      >
        <option value="">Select field...</option>
        {csvHeaders.map(header => (
          <option key={header} value={header}>{header}</option>
        ))}
      </select>
      {sampleValue && (
        <p className="text-xs text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded truncate">
          Sample: {sampleValue}
        </p>
      )}
    </div>
  );
};

export default FieldMappingRow;
