
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

interface UploadResult {
  status: 'success' | 'error';
  message: string;
  dealsProcessed?: number;
  summary?: {
    totalUnits: number;
    totalGross: number;
    totalFiProfit: number;
    totalProfit: number;
    newUnits: number;
    usedUnits: number;
    newGross: number;
    usedGross: number;
  };
}

interface UploadResultProps {
  uploadResult: UploadResult;
}

const UploadResultComponent = ({ uploadResult }: UploadResultProps) => {
  const formatCurrency = (value?: number) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={uploadResult.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3">
          {uploadResult.status === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${uploadResult.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {uploadResult.message}
            </p>
            {uploadResult.summary && (
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-green-700">
                <div>
                  <p className="font-medium">Unit Summary:</p>
                  <p>Total Units: {uploadResult.summary.totalUnits}</p>
                  <p>New Units: {uploadResult.summary.newUnits}</p>
                  <p>Used Units: {uploadResult.summary.usedUnits}</p>
                </div>
                <div>
                  <p className="font-medium">Profit Summary:</p>
                  <p>Total Gross: {formatCurrency(uploadResult.summary.totalGross)}</p>
                  <p>F&I Profit: {formatCurrency(uploadResult.summary.totalFiProfit)}</p>
                  <p>Total Profit: {formatCurrency(uploadResult.summary.totalProfit)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadResultComponent;
