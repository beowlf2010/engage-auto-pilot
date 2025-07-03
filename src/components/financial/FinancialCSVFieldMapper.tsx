
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FileSpreadsheet, CheckCircle } from "lucide-react";

export interface FinancialFieldMapping {
  date: string;
  age?: string;
  stockNumber: string;
  vin6?: string;
  vehicle: string;
  trade?: string;
  salePrice: string;
  customer: string;
  grossProfit: string;
  financeProfit: string; // Now required
  totalProfit: string;
}

interface FinancialCSVFieldMapperProps {
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingComplete: (mapping: FinancialFieldMapping) => void;
  onCancel: () => void;
}

const FinancialCSVFieldMapper = ({
  csvHeaders,
  sampleData,
  onMappingComplete,
  onCancel
}: FinancialCSVFieldMapperProps) => {
  const [mapping, setMapping] = useState<FinancialFieldMapping>(() => {
    // Auto-detect common column mappings
    const autoMapping: Partial<FinancialFieldMapping> = {};
    
    csvHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('date') || lowerHeader === 'date') {
        autoMapping.date = header;
      } else if (lowerHeader.includes('age') || lowerHeader === 'age') {
        autoMapping.age = header;
      } else if (lowerHeader.includes('stock') || lowerHeader === 'stock') {
        autoMapping.stockNumber = header;
      } else if (lowerHeader.includes('vin') || lowerHeader === 'vin6') {
        autoMapping.vin6 = header;
      } else if (lowerHeader.includes('vehicle') || lowerHeader === 'vehicle') {
        autoMapping.vehicle = header;
      } else if (lowerHeader.includes('trade') || lowerHeader === 'trade') {
        autoMapping.trade = header;
      } else if (lowerHeader.includes('slp') || lowerHeader.includes('sale') || lowerHeader === 'slp') {
        autoMapping.salePrice = header;
      } else if (lowerHeader.includes('customer') || lowerHeader === 'customer') {
        autoMapping.customer = header;
      } else if (lowerHeader.includes('gross') || lowerHeader === 'gross') {
        autoMapping.grossProfit = header;
      } else if (lowerHeader.includes('fi') || lowerHeader.includes('finance') || lowerHeader === 'fi' || lowerHeader.includes('f&i') || lowerHeader.includes('f & i')) {
        autoMapping.financeProfit = header;
      } else if (lowerHeader.includes('total') || lowerHeader === 'total') {
        autoMapping.totalProfit = header;
      }
    });
    
    return autoMapping as FinancialFieldMapping;
  });

  const requiredFields = [
    { key: 'date' as keyof FinancialFieldMapping, label: 'Transaction Date', required: true },
    { key: 'stockNumber' as keyof FinancialFieldMapping, label: 'Stock Number', required: true },
    { key: 'vehicle' as keyof FinancialFieldMapping, label: 'Vehicle Description', required: true },
    { key: 'salePrice' as keyof FinancialFieldMapping, label: 'Sale Price (SLP)', required: true },
    { key: 'customer' as keyof FinancialFieldMapping, label: 'Customer Name', required: true },
    { key: 'grossProfit' as keyof FinancialFieldMapping, label: 'Front End Gross Profit', required: true },
    { key: 'financeProfit' as keyof FinancialFieldMapping, label: 'Finance Profit (FI) - Required', required: true },
    { key: 'totalProfit' as keyof FinancialFieldMapping, label: 'Total Profit', required: true }
  ];

  const optionalFields = [
    { key: 'age' as keyof FinancialFieldMapping, label: 'Age (Days in Inventory)', required: false },
    { key: 'vin6' as keyof FinancialFieldMapping, label: 'VIN (Last 6 digits)', required: false },
    { key: 'trade' as keyof FinancialFieldMapping, label: 'Trade Value', required: false }
  ];

  const handleMappingChange = (fieldKey: keyof FinancialFieldMapping, value: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const getSampleValue = (fieldKey: keyof FinancialFieldMapping): string => {
    const headerName = mapping[fieldKey];
    return headerName && sampleData ? sampleData[headerName] || '' : '';
  };

  const isRequiredFieldsMapped = () => {
    return requiredFields.every(field => mapping[field.key]);
  };

  const handleComplete = () => {
    if (isRequiredFieldsMapped()) {
      onMappingComplete(mapping);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5" />
          <span>Map Financial Data Fields</span>
        </CardTitle>
        <p className="text-sm text-slate-600">
          Map your file's columns to the required financial data fields. Finance Profit (FI) is now mandatory and must be mapped to proceed.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Fields */}
        <div>
          <h4 className="font-medium mb-3 text-slate-700">Required Fields</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requiredFields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium mb-1 flex items-center space-x-2">
                  <span>{field.label}</span>
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                  {mapping[field.key] && (
                    <Badge variant="secondary" className="text-xs">Mapped</Badge>
                  )}
                </label>
                <select
                  value={mapping[field.key] || ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">Select field...</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
                {getSampleValue(field.key) && (
                  <p className="text-xs text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded truncate">
                    Sample: {getSampleValue(field.key)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Optional Fields */}
        <div>
          <h4 className="font-medium mb-3 text-slate-700">Optional Fields</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {optionalFields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium mb-1 flex items-center space-x-2">
                  <span>{field.label}</span>
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                  {mapping[field.key] && (
                    <Badge variant="secondary" className="text-xs">Mapped</Badge>
                  )}
                </label>
                <select
                  value={mapping[field.key] || ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">Select field...</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
                {getSampleValue(field.key) && (
                  <p className="text-xs text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded truncate">
                    Sample: {getSampleValue(field.key)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={!isRequiredFieldsMapped()}
            className="flex items-center space-x-2"
          >
            {isRequiredFieldsMapped() ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>
              {isRequiredFieldsMapped() ? 'Process File' : 'Map Required Fields'}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialCSVFieldMapper;
