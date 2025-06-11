
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
    newUnits: number;
    usedUnits: number;
  };
}

interface UploadResultProps {
  uploadResult: UploadResult;
}

const UploadResultComponent = ({ uploadResult }: UploadResultProps) => {
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
              <div className="mt-2 text-sm text-green-700">
                <p>Total Units: {uploadResult.summary.totalUnits}</p>
                <p>Total Gross: ${uploadResult.summary.totalGross?.toLocaleString()}</p>
                <p>F&I Profit: ${uploadResult.summary.totalFiProfit?.toLocaleString()}</p>
                <p>New/Used: {uploadResult.summary.newUnits}/{uploadResult.summary.usedUnits}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadResultComponent;
