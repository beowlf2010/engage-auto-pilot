
import { CheckCircle, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UploadResultProps {
  result: {
    status: 'success' | 'error';
    message: string;
    dealsProcessed?: number;
    summary?: any;
    reportDate?: string;
    preservedDealTypes?: number;
  };
}

const UploadResult = ({ result }: UploadResultProps) => {
  const isSuccess = result.status === 'success';

  return (
    <Card className={`${isSuccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isSuccess ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <span className={isSuccess ? 'text-green-800' : 'text-red-800'}>
            {isSuccess ? 'Upload Successful' : 'Upload Failed'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={isSuccess ? 'text-green-700' : 'text-red-700'}>
          {result.message}
        </p>

        {isSuccess && result.summary && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <CardDescription className="font-medium text-green-800">Report Date</CardDescription>
              <p className="text-green-700">{result.reportDate}</p>
            </div>
            <div>
              <CardDescription className="font-medium text-green-800">Deals Processed</CardDescription>
              <p className="text-green-700">{result.dealsProcessed}</p>
            </div>
          </div>
        )}

        {isSuccess && result.preservedDealTypes !== undefined && result.preservedDealTypes > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-blue-800 font-medium">Deal Types Preserved</p>
              <p className="text-blue-700 text-sm">
                {result.preservedDealTypes} existing wholesale/dealer trade classifications were preserved during this upload.
              </p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {result.preservedDealTypes} preserved
            </Badge>
          </div>
        )}

        {isSuccess && result.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-green-200">
            <div className="text-center">
              <CardDescription className="font-medium text-green-800">Total Sales</CardDescription>
              <p className="text-lg font-semibold text-green-700">
                ${result.summary.totalSales?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-center">
              <CardDescription className="font-medium text-green-800">Total Gross</CardDescription>
              <p className="text-lg font-semibold text-green-700">
                ${result.summary.totalGross?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-center">
              <CardDescription className="font-medium text-green-800">Total F&I</CardDescription>
              <p className="text-lg font-semibold text-green-700">
                ${result.summary.totalFiProfit?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadResult;
