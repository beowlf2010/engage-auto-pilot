import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { InventoryFieldSection as InventoryFieldSectionType } from './inventoryFieldConfig';
import { InventoryFieldMapping } from './types';
import InventoryFieldMappingRow from './InventoryFieldMappingRow';

interface InventoryFieldSectionProps {
  section: InventoryFieldSectionType;
  mapping: InventoryFieldMapping;
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingChange: (key: keyof InventoryFieldMapping, value: string) => void;
}

const InventoryFieldSection = ({
  section,
  mapping,
  csvHeaders,
  sampleData,
  onMappingChange
}: InventoryFieldSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(!section.collapsible);

  const toggleExpanded = () => {
    if (section.collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  // Count how many fields in this section are mapped
  const mappedCount = section.fields.filter(field => mapping[field.key]).length;
  const totalCount = section.fields.length;

  return (
    <div className="border border-border rounded-lg p-4">
      <div 
        className={`flex items-center justify-between mb-3 ${section.collapsible ? 'cursor-pointer' : ''}`}
        onClick={toggleExpanded}
      >
        <h4 className="font-medium flex items-center space-x-2">
          {section.icon && <section.icon className="w-4 h-4" />}
          <span>{section.title}</span>
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {mappedCount}/{totalCount} mapped
          </span>
        </h4>
        
        {section.collapsible && (
          <div className="text-muted-foreground">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {section.fields.map(({ key, label, required, description }) => (
            <InventoryFieldMappingRow
              key={key}
              fieldKey={key}
              label={label}
              required={required}
              description={description}
              mapping={mapping}
              csvHeaders={csvHeaders}
              sampleData={sampleData}
              onMappingChange={onMappingChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryFieldSection;