
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

const FlexibleUploadInfoCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Flexible Upload Process</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">Any Format Supported</p>
                <p className="text-slate-600">Upload Excel or CSV files with any column structure</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">Smart Column Detection</p>
                <p className="text-slate-600">We automatically detect and suggest column mappings</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">Required Fields</p>
                <p className="text-slate-600">Date, Stock Number, Vehicle, Sale Price, Customer, Gross Profit, Total Profit</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">Optional Fields</p>
                <p className="text-slate-600">Age, VIN, Trade Value, Finance Profit - enhance your data when available</p>
              </div>
            </div>
          </div>
          
          <div className="pt-3 border-t">
            <p className="text-xs text-slate-500">
              <strong>How it works:</strong> Upload any financial report → We analyze the structure → 
              Map your columns to our fields → Process your data
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlexibleUploadInfoCard;
