import React, { useState } from 'react';
import { Bookmark, Plus, Trash2, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUnifiedSearch, SearchPreset } from './UnifiedSearchProvider';

interface SearchPresetManagerProps {
  onClose: () => void;
}

export const SearchPresetManager: React.FC<SearchPresetManagerProps> = ({ onClose }) => {
  const { 
    presets, 
    activePreset, 
    savePreset, 
    loadPreset, 
    deletePreset,
    searchTerm,
    activeFilters 
  } = useUnifiedSearch();
  
  const [newPresetName, setNewPresetName] = useState('');
  const [showNewPresetForm, setShowNewPresetForm] = useState(false);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    
    savePreset(newPresetName.trim());
    setNewPresetName('');
    setShowNewPresetForm(false);
  };

  const canSavePreset = searchTerm.length > 0 || activeFilters.length > 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          <h3 className="font-medium">Search Presets</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Save Current Search */}
        {canSavePreset && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Save Current Search</Label>
            {!showNewPresetForm ? (
              <Button
                onClick={() => setShowNewPresetForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Save as Preset
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Enter preset name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSavePreset();
                    } else if (e.key === 'Escape') {
                      setShowNewPresetForm(false);
                      setNewPresetName('');
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSavePreset}
                    disabled={!newPresetName.trim()}
                    size="sm"
                    className="flex-1"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNewPresetForm(false);
                      setNewPresetName('');
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current Search Preview */}
        {canSavePreset && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              CURRENT SEARCH
            </Label>
            {searchTerm && (
              <div className="text-sm">
                <strong>Search:</strong> "{searchTerm}"
              </div>
            )}
            {activeFilters.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Filters:</div>
                <div className="flex flex-wrap gap-1">
                  {activeFilters.map(filter => (
                    <Badge key={filter.id} variant="secondary" className="text-xs">
                      {filter.label}: {String(filter.value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Presets */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Saved Presets</Label>
          
          {presets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No saved presets</p>
              <p className="text-xs">Save searches you use frequently</p>
            </div>
          ) : (
            <div className="space-y-1">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-colors
                    ${activePreset?.id === preset.id 
                      ? 'bg-primary/10 border-primary/20' 
                      : 'hover:bg-muted/50'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadPreset(preset)}>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{preset.name}</h4>
                      {preset.isDefault && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      )}
                      {activePreset?.id === preset.id && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                    
                    <div className="mt-1 space-y-1">
                      {preset.searchTerm && (
                        <div className="text-xs text-muted-foreground">
                          Search: "{preset.searchTerm}"
                        </div>
                      )}
                      {preset.filters.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {preset.filters.slice(0, 3).map((filter, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {filter.label}
                            </Badge>
                          ))}
                          {preset.filters.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{preset.filters.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePreset(preset.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Preset Suggestions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Presets</Label>
          <div className="grid grid-cols-1 gap-1">
            {[
              { name: 'New Leads Today', searchTerm: '', filters: [
                { field: 'status', label: 'Status', value: 'new', operator: 'eq', type: 'select' },
                { field: 'created_at', label: 'Created Date', value: new Date().toISOString().split('T')[0], operator: 'gte', type: 'date' }
              ]},
              { name: 'Hot Prospects', searchTerm: '', filters: [
                { field: 'status', label: 'Status', value: 'qualified', operator: 'eq', type: 'select' }
              ]},
              { name: 'New Vehicles Under $30k', searchTerm: '', filters: [
                { field: 'condition', label: 'Condition', value: 'new', operator: 'eq', type: 'select' },
                { field: 'price', label: 'Price', value: '30000', operator: 'lte', type: 'number' }
              ]},
              { name: 'Recent Messages', searchTerm: '', filters: [
                { field: 'direction', label: 'Direction', value: 'in', operator: 'eq', type: 'select' }
              ]},
            ].map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  const preset: SearchPreset = {
                    id: crypto.randomUUID(),
                    name: suggestion.name,
                    searchTerm: suggestion.searchTerm,
                    filters: suggestion.filters.map(f => ({ ...f, id: crypto.randomUUID() })) as any,
                  };
                  loadPreset(preset);
                }}
                className="justify-start text-xs h-8"
              >
                {suggestion.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};