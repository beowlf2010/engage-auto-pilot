
import { FieldDefinition, FieldSection as FieldSectionType } from './fieldMappingConfig';
import { FieldMapping } from './types';
import FieldMappingRow from './FieldMappingRow';

interface FieldSectionProps {
  section: FieldSectionType;
  mapping: FieldMapping;
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingChange: (key: keyof FieldMapping, value: string) => void;
}

const FieldSection = ({
  section,
  mapping,
  csvHeaders,
  sampleData,
  onMappingChange
}: FieldSectionProps) => {
  return (
    <div>
      <h4 className="font-medium mb-3 flex items-center space-x-2">
        {section.icon && <section.icon className="w-4 h-4" />}
        <span>{section.title}</span>
      </h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {section.fields.map(({ key, label, required }) => (
          <FieldMappingRow
            key={key}
            fieldKey={key}
            label={label}
            required={required}
            mapping={mapping}
            csvHeaders={csvHeaders}
            sampleData={sampleData}
            onMappingChange={onMappingChange}
          />
        ))}
      </div>
    </div>
  );
};

export default FieldSection;
