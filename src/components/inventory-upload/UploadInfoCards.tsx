
import { Card } from "@/components/ui/card";
import { FileSpreadsheet, FileText } from "lucide-react";

const UploadInfoCards = () => {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-medium">Enhanced File Support</h3>
        </div>
        
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="font-medium">Excel Files</span>
            <span className="text-slate-600">.xlsx, .xls (Multi-sheet)</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">CSV Files</span>
            <span className="text-slate-600">.csv</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Formats Detected</span>
            <span className="text-slate-600">Vauto, GM Global</span>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>New:</strong> Comprehensive field capture including pricing, 
            warranty, history, and dealer-specific data. Original files are 
            permanently stored for your records.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-sm text-green-800">
            <strong>Auto-Detection:</strong> System automatically detects Vauto 
            New, Vauto Used, and GM Global formats for optimized field mapping.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-medium">Comprehensive Data Capture</h3>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Required Fields</span>
            <span className="text-slate-600">VIN, Make, Model</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Pricing Fields</span>
            <span className="text-slate-600">MSRP, Invoice, Wholesale</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Dealer Data</span>
            <span className="text-slate-600">Pack, Holdback, Incentives</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Vehicle History</span>
            <span className="text-slate-600">Accidents, Owners, Records</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Warranty Info</span>
            <span className="text-slate-600">Type, Duration, Coverage</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UploadInfoCards;
