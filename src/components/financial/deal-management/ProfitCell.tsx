
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { isUsedVehicle } from "./DealManagementUtils";

interface Deal {
  id: string;
  stock_number?: string;
  gross_profit?: number;
  fi_profit?: number;
  total_profit?: number;
  original_gross_profit?: number;
  original_fi_profit?: number;
  original_total_profit?: number;
}

interface ProfitCellProps {
  deal: Deal;
  field: 'gross' | 'fi' | 'total';
  value: number;
  formatCurrency: (amount: number) => string;
  packAdjustmentEnabled?: boolean;
  localPackAdjustment?: number;
}

const ProfitCell = ({
  deal,
  field,
  value,
  formatCurrency,
  packAdjustmentEnabled,
  localPackAdjustment
}: ProfitCellProps) => {
  const hasChangedFromOriginal = (field: 'gross' | 'fi' | 'total') => {
    if (!packAdjustmentEnabled) return false;
    
    switch (field) {
      case 'gross':
        return deal.original_gross_profit !== undefined && 
               Math.abs((deal.gross_profit || 0) - deal.original_gross_profit) > 0.01;
      case 'fi':
        return deal.original_fi_profit !== undefined && 
               Math.abs((deal.fi_profit || 0) - deal.original_fi_profit) > 0.01;
      case 'total':
        return deal.original_total_profit !== undefined && 
               Math.abs((deal.total_profit || 0) - deal.original_total_profit) > 0.01;
      default:
        return false;
    }
  };

  const showPackIndicator = (field === 'gross' || field === 'total') && 
                           packAdjustmentEnabled && 
                           isUsedVehicle(deal.stock_number) && 
                           localPackAdjustment;

  return (
    <div className="text-right">
      <div className="flex items-center justify-end space-x-1">
        <span className="font-semibold">
          {formatCurrency(value)}
        </span>
        {showPackIndicator && (
          <span className="text-xs text-green-600 font-medium">
            +{formatCurrency(localPackAdjustment)}
          </span>
        )}
      </div>
      {hasChangedFromOriginal(field) && (
        <div className="text-xs text-slate-500">
          Was: {formatCurrency(
            field === 'gross' ? deal.original_gross_profit || 0 :
            field === 'fi' ? deal.original_fi_profit || 0 :
            deal.original_total_profit || 0
          )}
        </div>
      )}
    </div>
  );
};

export default ProfitCell;
