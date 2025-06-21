
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface DetectedMapping {
  rpo_code: string;
  description: string;
  category?: string;
  feature_type?: string;
  mapped_value?: string;
  confidence: number;
}

interface RPOMappingCardProps {
  mapping: DetectedMapping;
  index: number;
  onUpdate: (index: number, field: keyof DetectedMapping, value: string) => void;
  onRemove: (index: number) => void;
  categories: string[];
  featureTypes: string[];
}

const RPOMappingCard: React.FC<RPOMappingCardProps> = ({
  mapping,
  index,
  onUpdate,
  onRemove,
  categories,
  featureTypes
}) => {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="font-mono">
            {mapping.rpo_code}
          </Badge>
          <Badge variant="secondary">
            Confidence: {Math.round(mapping.confidence * 100)}%
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={mapping.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Mapped Value</Label>
          <Input
            value={mapping.mapped_value || ''}
            onChange={(e) => onUpdate(index, 'mapped_value', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select 
            value={mapping.category} 
            onValueChange={(value) => onUpdate(index, 'category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Feature Type</Label>
          <Select 
            value={mapping.feature_type} 
            onValueChange={(value) => onUpdate(index, 'feature_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select feature type" />
            </SelectTrigger>
            <SelectContent>
              {featureTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default RPOMappingCard;
