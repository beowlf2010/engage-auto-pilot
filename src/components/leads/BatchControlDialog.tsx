import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Users, 
  BarChart3,
  CheckCircle,
  Info
} from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  vehicle_interest?: string;
  ai_opt_in?: boolean;
}

interface BatchControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadsToProcess: Lead[];
  onProcessBatch: (leadIds: string[]) => Promise<void>;
  isProcessing: boolean;
}

const BatchControlDialog: React.FC<BatchControlDialogProps> = ({
  open,
  onOpenChange,
  leadsToProcess,
  onProcessBatch,
  isProcessing
}) => {
  const [selectedBatchSize, setSelectedBatchSize] = useState<number>(25);

  const MAX_SAFE_BATCH = 50;
  const RECOMMENDED_BATCH = 25;
  const SMALL_BATCH = 10;

  const getBatchSizeOptions = () => {
    const totalLeads = leadsToProcess.length;
    const options = [];

    // Always include small batch option
    if (totalLeads >= SMALL_BATCH) {
      options.push({
        size: SMALL_BATCH,
        label: `Small batch (${SMALL_BATCH} leads)`,
        description: 'Safest option - test with a small group first',
        recommended: totalLeads > 100,
        variant: 'safe' as const
      });
    }

    // Include recommended batch if we have enough leads
    if (totalLeads >= RECOMMENDED_BATCH) {
      options.push({
        size: RECOMMENDED_BATCH,
        label: `Recommended batch (${RECOMMENDED_BATCH} leads)`,
        description: 'Balanced approach for most situations',
        recommended: totalLeads <= 100,
        variant: 'recommended' as const
      });
    }

    // Include larger batch if we have many leads
    if (totalLeads >= MAX_SAFE_BATCH) {
      options.push({
        size: MAX_SAFE_BATCH,
        label: `Large batch (${MAX_SAFE_BATCH} leads)`,
        description: 'Maximum safe batch size',
        recommended: false,
        variant: 'caution' as const
      });
    }

    // Option to process all (with warning if too many)
    options.push({
      size: totalLeads,
      label: `All leads (${totalLeads} leads)`,
      description: totalLeads > MAX_SAFE_BATCH 
        ? 'Not recommended - high risk of overwhelming recipients'
        : 'Process all remaining leads',
      recommended: totalLeads <= RECOMMENDED_BATCH,
      variant: totalLeads > MAX_SAFE_BATCH ? 'danger' as const : 'normal' as const
    });

    return options;
  };

  const handleProcessBatch = async () => {
    const batchLeads = leadsToProcess.slice(0, selectedBatchSize);
    const leadIds = batchLeads.map(lead => lead.id);
    await onProcessBatch(leadIds);
  };

  const getRemainingAfterBatch = () => {
    return Math.max(0, leadsToProcess.length - selectedBatchSize);
  };

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'safe':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'recommended':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      case 'caution':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      case 'danger':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const options = getBatchSizeOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Choose Batch Size
          </DialogTitle>
          <DialogDescription>
            Select how many leads to enable AI messaging for in this batch. 
            You can process remaining leads in additional batches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning for large batches */}
          {leadsToProcess.length > MAX_SAFE_BATCH && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                You're about to enable AI messaging for {leadsToProcess.length} leads. 
                Consider processing in smaller batches to avoid overwhelming recipients 
                and to monitor response quality.
              </AlertDescription>
            </Alert>
          )}

          {/* Batch size options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Select batch size:</h4>
            {options.map((option) => (
              <div key={option.size}>
                <button
                  onClick={() => setSelectedBatchSize(option.size)}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    selectedBatchSize === option.size 
                      ? 'border-blue-500 bg-blue-50' 
                      : getVariantStyles(option.variant)
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      {option.recommended && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Recommended
                        </Badge>
                      )}
                      {option.variant === 'danger' && (
                        <Badge variant="destructive">
                          High Risk
                        </Badge>
                      )}
                    </div>
                    {selectedBatchSize === option.size && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </button>
              </div>
            ))}
          </div>

          {/* Batch preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-sm">Batch Preview</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Processing: {selectedBatchSize} leads in this batch</div>
              <div>• Remaining: {getRemainingAfterBatch()} leads for future batches</div>
              <div>• Estimated messages: {selectedBatchSize} initial AI messages will be sent</div>
            </div>
          </div>

          {/* Safety reminder */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Safety tip:</strong> Start with smaller batches to test message quality 
              and response rates before processing larger groups. You can always enable 
              AI for more leads later.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleProcessBatch}
            disabled={isProcessing}
            className={selectedBatchSize > MAX_SAFE_BATCH ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <Users className="w-4 h-4 mr-2" />
            {isProcessing 
              ? 'Processing...' 
              : `Enable AI for ${selectedBatchSize} Lead${selectedBatchSize === 1 ? '' : 's'}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchControlDialog;