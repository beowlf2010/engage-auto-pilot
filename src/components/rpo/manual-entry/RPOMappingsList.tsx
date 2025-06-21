
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import RPOMappingCard from './RPOMappingCard';

interface DetectedMapping {
  rpo_code: string;
  description: string;
  category?: string;
  feature_type?: string;
  mapped_value?: string;
  confidence: number;
}

interface RPOMappingsListProps {
  mappings: DetectedMapping[];
  onUpdateMapping: (index: number, field: keyof DetectedMapping, value: string) => void;
  onRemoveMapping: (index: number) => void;
  onSaveMappings: () => void;
  isSaving: boolean;
  categories: string[];
  featureTypes: string[];
}

const RPOMappingsList: React.FC<RPOMappingsListProps> = ({
  mappings,
  onUpdateMapping,
  onRemoveMapping,
  onSaveMappings,
  isSaving,
  categories,
  featureTypes
}) => {
  if (mappings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detected RPO Mappings ({mappings.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mappings.map((mapping, index) => (
            <RPOMappingCard
              key={index}
              mapping={mapping}
              index={index}
              onUpdate={onUpdateMapping}
              onRemove={onRemoveMapping}
              categories={categories}
              featureTypes={featureTypes}
            />
          ))}

          <Button 
            onClick={onSaveMappings} 
            disabled={isSaving}
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : `Save ${mappings.length} RPO Mappings`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RPOMappingsList;
