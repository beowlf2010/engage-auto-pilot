
import { isUsedVehicle } from "./DealManagementUtils";

interface Deal {
  id: string;
  stock_number?: string;
}

interface PackAdjustmentCellProps {
  deal: Deal;
  packAdjustmentEnabled: boolean;
  localPackAdjustment: number;
  formatCurrency: (amount: number) => string;
}

const PackAdjustmentCell = ({
  deal,
  packAdjustmentEnabled,
  localPackAdjustment,
  formatCurrency
}: PackAdjustmentCellProps) => {
  // Only show pack adjustment for used vehicles when enabled
  const showPackAdjustment = packAdjustmentEnabled && 
                            isUsedVehicle(deal.stock_number) && 
                            localPackAdjustment > 0;

  return (
    <div className="text-right">
      {showPackAdjustment ? (
        <span className="font-semibold text-green-600">
          +{formatCurrency(localPackAdjustment)}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      )}
    </div>
  );
};

export default PackAdjustmentCell;
