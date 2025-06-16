
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";

interface BulkActionsProps {
  selectedDeals: string[];
  bulkDealType: string;
  setBulkDealType: (type: string) => void;
  onBulkUpdate: () => void;
  hasLockedDeals?: boolean;
}

const BulkActions = ({
  selectedDeals,
  bulkDealType,
  setBulkDealType,
  onBulkUpdate,
  hasLockedDeals = false
}: BulkActionsProps) => {
  if (selectedDeals.length === 0) return null;

  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            {selectedDeals.length} deals selected
          </span>
          {hasLockedDeals && (
            <div className="flex items-center space-x-1 text-orange-600">
              <Lock className="w-4 h-4" />
              <span className="text-sm">Some deals are locked and cannot be changed</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Select value={bulkDealType} onValueChange={setBulkDealType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Set type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="dealer_trade">Dealer Trade</SelectItem>
              <SelectItem value="wholesale">Wholesale</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onBulkUpdate} size="sm">
            Update Selected
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;
