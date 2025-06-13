
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const UploadInfoCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Expected Format</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-700 mb-1">Required Columns (in this exact order):</p>
            <ul className="space-y-1 ml-4">
              <li>• <strong>Date</strong> - Transaction date</li>
              <li>• <strong>Age</strong> - Days in inventory</li>
              <li>• <strong>Stock</strong> - Stock number</li>
              <li>• <strong>Vin6</strong> - Last 6 digits of VIN</li>
              <li>• <strong>Vehicle</strong> - Year/make/model</li>
              <li>• <strong>Trade</strong> - Trade-in value</li>
              <li>• <strong>SLP</strong> - Sale price</li>
              <li>• <strong>Customer</strong> - Buyer name</li>
              <li>• <strong>Gross</strong> - Gross profit</li>
              <li>• <strong>FI</strong> - Finance profit</li>
              <li>• <strong>Total</strong> - Total profit</li>
            </ul>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-slate-500">
              Upload your DMS Sales Analysis Detail report as Excel (.xlsx, .xls) or CSV (.csv) format with these column headers.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadInfoCard;
