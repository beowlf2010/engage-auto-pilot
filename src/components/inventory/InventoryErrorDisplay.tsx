
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Car } from "lucide-react";

interface InventoryErrorDisplayProps {
  error: Error;
  onRetry: () => void;
}

const InventoryErrorDisplay = ({ error, onRetry }: InventoryErrorDisplayProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
          <p className="text-slate-600 mt-1">Error loading inventory data</p>
        </div>
      </div>
      <Card className="p-8 text-center">
        <div className="text-red-600 mb-4">
          <Car className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Unable to load inventory</h3>
          <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
        </div>
        <Button onClick={onRetry} variant="outline" className="mr-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </Card>
    </div>
  );
};

export default InventoryErrorDisplay;
