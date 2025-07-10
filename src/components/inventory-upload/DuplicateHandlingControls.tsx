import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Settings, RefreshCw, FileText, Database } from "lucide-react";

interface DuplicateHandlingControlsProps {
  duplicateStrategy: 'skip' | 'update' | 'replace';
  onStrategyChange: (strategy: 'skip' | 'update' | 'replace') => void;
  duplicatesFound?: number;
  onClearOldInventory?: () => void;
  clearingInventory?: boolean;
}

const DuplicateHandlingControls = ({ 
  duplicateStrategy, 
  onStrategyChange, 
  duplicatesFound,
  onClearOldInventory,
  clearingInventory
}: DuplicateHandlingControlsProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const strategies = [
    {
      value: 'skip' as const,
      label: 'Skip Duplicates',
      description: 'Keep existing vehicles, skip new ones with same VIN/Stock',
      icon: '⏭️',
      recommended: true
    },
    {
      value: 'update' as const,
      label: 'Update Existing',
      description: 'Update existing vehicles with new data',
      icon: '🔄',
      recommended: false
    },
    {
      value: 'replace' as const,
      label: 'Replace Duplicates',
      description: 'Delete existing vehicles and insert new ones',
      icon: '🔄',
      recommended: false
    }
  ];

  const selectedStrategy = strategies.find(s => s.value === duplicateStrategy);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-orange-600" />
            <span className="text-orange-800">Duplicate Handling</span>
            {selectedStrategy?.recommended && (
              <Badge variant="secondary" className="text-xs">
                Recommended
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-orange-600 hover:text-orange-700"
          >
            <FileText className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Select value={duplicateStrategy} onValueChange={onStrategyChange}>
              <SelectTrigger className="bg-white border-orange-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    <div className="flex items-center space-x-2">
                      <span>{strategy.icon}</span>
                      <span>{strategy.label}</span>
                      {strategy.recommended && (
                        <Badge variant="outline" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {onClearOldInventory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearOldInventory}
              disabled={clearingInventory}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {clearingInventory ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Clear Old Inventory
                </>
              )}
            </Button>
          )}
        </div>

        {selectedStrategy && (
          <div className="bg-white bg-opacity-50 rounded-md p-3 border border-orange-200">
            <div className="flex items-start space-x-2">
              <span className="text-lg">{selectedStrategy.icon}</span>
              <div>
                <h4 className="font-medium text-orange-800">{selectedStrategy.label}</h4>
                <p className="text-sm text-orange-700">{selectedStrategy.description}</p>
              </div>
            </div>
          </div>
        )}

        {duplicatesFound !== undefined && duplicatesFound > 0 && (
          <div className="flex items-center space-x-2 p-2 bg-orange-100 rounded-md border border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-700">
              {duplicatesFound} potential duplicates detected in current upload
            </span>
          </div>
        )}

        {showDetails && (
          <div className="mt-4 p-3 bg-white bg-opacity-75 rounded-md border border-orange-200">
            <h4 className="font-medium text-orange-800 mb-2">Strategy Details:</h4>
            <div className="space-y-2 text-sm text-orange-700">
              <div><strong>Skip Duplicates (Recommended):</strong> Safest option. Existing vehicles remain unchanged. New vehicles with duplicate VINs or stock numbers are recorded but not inserted.</div>
              <div><strong>Update Existing:</strong> Merges new data with existing vehicles. Only non-null fields from the new data will overwrite existing values.</div>
              <div><strong>Replace Duplicates:</strong> Completely removes existing vehicles and inserts new ones. Use with caution as this may affect vehicle history and lead associations.</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DuplicateHandlingControls;