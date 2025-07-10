import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DollarSign,
  Tag,
  Mail,
  Archive,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  BarChart3
} from 'lucide-react';
import { InventoryItem } from '@/services/inventory/types';

interface BulkOperationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicles: InventoryItem[];
  operation: string;
  onExecute: (operation: string, data: any) => Promise<void>;
}

interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

const BulkOperationsDialog = ({
  isOpen,
  onClose,
  selectedVehicles,
  operation,
  onExecute
}: BulkOperationsDialogProps) => {
  const [operationData, setOperationData] = useState<any>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<BulkOperationResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleExecute = async () => {
    setIsExecuting(true);
    setProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onExecute(operation, {
        vehicles: selectedVehicles,
        ...operationData
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      // Mock result
      setResult({
        success: selectedVehicles.length - 1,
        failed: 1,
        errors: ['Vehicle XYZ123 could not be updated due to pending sale']
      });
    } catch (error) {
      setResult({
        success: 0,
        failed: selectedVehicles.length,
        errors: [error instanceof Error ? error.message : 'Operation failed']
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const resetDialog = () => {
    setOperationData({});
    setResult(null);
    setProgress(0);
    setIsExecuting(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const operationConfigs = {
    bulk_price_update: {
      title: 'Bulk Price Update',
      icon: DollarSign,
      description: 'Update pricing for selected vehicles',
      fields: [
        {
          key: 'adjustmentType',
          label: 'Adjustment Type',
          type: 'select',
          options: [
            { value: 'percentage', label: 'Percentage' },
            { value: 'fixed', label: 'Fixed Amount' },
            { value: 'set', label: 'Set Price' }
          ]
        },
        {
          key: 'adjustmentValue',
          label: 'Adjustment Value',
          type: 'number',
          placeholder: 'Enter amount or percentage'
        },
        {
          key: 'reason',
          label: 'Reason for Change',
          type: 'textarea',
          placeholder: 'Optional: Reason for price adjustment'
        }
      ]
    },
    bulk_status_change: {
      title: 'Bulk Status Change',
      icon: Tag,
      description: 'Change status for multiple vehicles',
      fields: [
        {
          key: 'newStatus',
          label: 'New Status',
          type: 'select',
          options: [
            { value: 'available', label: 'Available' },
            { value: 'pending', label: 'Pending' },
            { value: 'sold', label: 'Sold' },
            { value: 'service', label: 'In Service' },
            { value: 'wholesale', label: 'Wholesale' }
          ]
        },
        {
          key: 'statusReason',
          label: 'Reason',
          type: 'textarea',
          placeholder: 'Optional: Reason for status change'
        },
        {
          key: 'notifyStakeholders',
          label: 'Notify Stakeholders',
          type: 'checkbox',
          description: 'Send notifications to relevant team members'
        }
      ]
    },
    bulk_marketing: {
      title: 'Add to Marketing Campaign',
      icon: Mail,
      description: 'Add selected vehicles to marketing campaigns',
      fields: [
        {
          key: 'campaignType',
          label: 'Campaign Type',
          type: 'select',
          options: [
            { value: 'featured', label: 'Featured Inventory' },
            { value: 'sale', label: 'Sale Campaign' },
            { value: 'newsletter', label: 'Newsletter Feature' },
            { value: 'social', label: 'Social Media Promotion' }
          ]
        },
        {
          key: 'marketingMessage',
          label: 'Marketing Message',
          type: 'textarea',
          placeholder: 'Optional custom message for the campaign'
        },
        {
          key: 'startDate',
          label: 'Campaign Start Date',
          type: 'date'
        },
        {
          key: 'endDate',
          label: 'Campaign End Date',
          type: 'date'
        }
      ]
    },
    bulk_archive: {
      title: 'Archive Vehicles',
      icon: Archive,
      description: 'Archive selected vehicles',
      fields: [
        {
          key: 'archiveReason',
          label: 'Archive Reason',
          type: 'select',
          options: [
            { value: 'sold_external', label: 'Sold Externally' },
            { value: 'damaged', label: 'Damaged Beyond Repair' },
            { value: 'recalled', label: 'Manufacturer Recall' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          key: 'notes',
          label: 'Additional Notes',
          type: 'textarea',
          placeholder: 'Optional notes about archiving these vehicles'
        },
        {
          key: 'createBackup',
          label: 'Create Backup',
          type: 'checkbox',
          description: 'Create a backup before archiving'
        }
      ]
    },
    export_excel: {
      title: 'Export to Excel',
      icon: Download,
      description: 'Export selected vehicles to Excel format',
      fields: [
        {
          key: 'includeFields',
          label: 'Include Fields',
          type: 'multiselect',
          options: [
            { value: 'basic', label: 'Basic Info (Make, Model, Year, Price)' },
            { value: 'detailed', label: 'Detailed Specs' },
            { value: 'pricing', label: 'Pricing Details' },
            { value: 'leads', label: 'Lead Information' },
            { value: 'history', label: 'History & Dates' }
          ]
        },
        {
          key: 'format',
          label: 'Export Format',
          type: 'select',
          options: [
            { value: 'xlsx', label: 'Excel (.xlsx)' },
            { value: 'csv', label: 'CSV (.csv)' }
          ]
        }
      ]
    }
  };

  const config = operationConfigs[operation as keyof typeof operationConfigs];
  if (!config) return null;

  const Icon = config.icon;

  const renderField = (field: any) => {
    switch (field.type) {
      case 'select':
        return (
          <Select
            value={operationData[field.key] || ''}
            onValueChange={(value) => setOperationData({ ...operationData, [field.key]: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            value={operationData[field.key] || ''}
            onChange={(e) => setOperationData({ ...operationData, [field.key]: e.target.value })}
            rows={3}
          />
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.key}
              checked={operationData[field.key] || false}
              onCheckedChange={(checked) => setOperationData({ ...operationData, [field.key]: checked })}
            />
            <label htmlFor={field.key} className="text-sm">
              {field.description}
            </label>
          </div>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options.map((option: any) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={option.value}
                  checked={(operationData[field.key] || []).includes(option.value)}
                  onCheckedChange={(checked) => {
                    const current = operationData[field.key] || [];
                    const updated = checked
                      ? [...current, option.value]
                      : current.filter((v: string) => v !== option.value);
                    setOperationData({ ...operationData, [field.key]: updated });
                  }}
                />
                <label htmlFor={option.value} className="text-sm">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={operationData[field.key] || ''}
            onChange={(e) => setOperationData({ ...operationData, [field.key]: e.target.value })}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Vehicles Summary */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Selected Vehicles</h4>
              <Badge variant="secondary">{selectedVehicles.length} vehicles</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
            
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {selectedVehicles.slice(0, 10).map((vehicle) => (
                <Badge key={vehicle.id} variant="outline" className="text-xs">
                  {vehicle.stock_number || vehicle.vin?.slice(-6)} - {vehicle.year} {vehicle.make} {vehicle.model}
                </Badge>
              ))}
              {selectedVehicles.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedVehicles.length - 10} more
                </Badge>
              )}
            </div>
          </div>

          {/* Operation Configuration */}
          {!result && (
            <div className="space-y-4">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium">{field.label}</label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          )}

          {/* Progress Indicator */}
          {isExecuting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing vehicles...</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                {progress < 100 ? `Processing ${Math.round(progress)}%` : 'Finalizing...'}
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <Separator />
              <h4 className="font-medium">Operation Results</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">{result.success}</div>
                    <div className="text-sm text-green-600">Successful</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-900">{result.failed}</div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Errors encountered:</div>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button 
                onClick={handleExecute} 
                disabled={isExecuting}
                className="min-w-[120px]"
              >
                {isExecuting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Icon className="h-4 w-4 mr-2" />
                    Execute
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkOperationsDialog;