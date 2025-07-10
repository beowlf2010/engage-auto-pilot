
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface UploadResultProps {
  result: {
    status: 'success' | 'error';
    message: string;
    dealsProcessed?: number;
    summary?: any;
    reportDate?: string;
    preservedDealTypes?: number;
    dealsWithInventoryLink?: number;
    dealsWithoutInventoryLink?: number;
    missingFromInventory?: number;
    missingStockNumbers?: string[];
  };
}

const UploadResult = ({ result }: UploadResultProps) => {
  const isSuccess = result.status === 'success';
  const [showMissingStock, setShowMissingStock] = useState(false);

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

        {isSuccess && result.missingFromInventory !== undefined && result.missingFromInventory > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-amber-800 font-medium">Inventory Validation Results</p>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {result.missingFromInventory} missing
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <CardDescription className="text-amber-700">With Inventory Link</CardDescription>
                <p className="text-amber-800 font-medium">{result.dealsWithInventoryLink || 0} deals</p>
              </div>
              <div>
                <CardDescription className="text-amber-700">Without Inventory Link</CardDescription>
                <p className="text-amber-800 font-medium">{result.dealsWithoutInventoryLink || 0} deals</p>
              </div>
            </div>
            <p className="text-amber-700 text-sm mb-3">
              {result.dealsWithoutInventoryLink} deals were processed without inventory links because their stock numbers were not found in the inventory table.
            </p>
            {result.missingStockNumbers && result.missingStockNumbers.length > 0 && (
              <Collapsible open={showMissingStock} onOpenChange={setShowMissingStock}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                    {showMissingStock ? 'Hide' : 'Show'} Missing Stock Numbers ({result.missingStockNumbers.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-amber-100 rounded p-2 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {result.missingStockNumbers.map((stockNum, index) => (
                        <Badge key={index} variant="outline" className="bg-white text-amber-800 border-amber-300 text-xs">
                          {stockNum}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {isSuccess && result.summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-green-200">
            <div className="text-center">
              <CardDescription className="font-medium text-green-800">Total Sales</CardDescription>
              <p className="text-lg font-semibold text-green-700">
                ${(result.summary.totalSales || result.summary.total_sales || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <CardDescription className="font-medium text-green-800">Total Gross</CardDescription>
              <p className="text-lg font-semibold text-green-700">
                ${(result.summary.totalGross || result.summary.total_gross || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <CardDescription className="font-medium text-green-800">Total F&I</CardDescription>
              <p className="text-lg font-semibold text-green-700">
                ${(result.summary.totalFiProfit || result.summary.total_fi_profit || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadResult;
