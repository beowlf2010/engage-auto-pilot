
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import VehicleIdentifier from "@/components/shared/VehicleIdentifier";
import DealTypeCell from "./DealTypeCell";
import ProfitCell from "./ProfitCell";
import ActionsCell from "./ActionsCell";

interface Deal {
  id: string;
  stock_number?: string;
  buyer_name?: string;
  year_model?: string;
  deal_type?: string;
  deal_type_locked?: boolean;
  sale_amount?: number;
  cost_amount?: number;
  gross_profit?: number;
  fi_profit?: number;
  total_profit?: number;
  upload_date: string;
  age?: number;
  original_gross_profit?: number;
  original_fi_profit?: number;
  original_total_profit?: number;
}

interface DealRowProps {
  deal: Deal;
  isSelected: boolean;
  onSelectDeal: (dealId: string) => void;
  onDealTypeUpdate: (dealId: string, newType: string, forceUnlock?: boolean) => void;
  onUnlockDeal: (dealId: string) => void;
  getAdjustedGrossProfit: (deal: Deal) => number;
  formatCurrency: (amount: number) => string;
  packAdjustmentEnabled: boolean;
  localPackAdjustment: number;
}

const DealRow = ({
  deal,
  isSelected,
  onSelectDeal,
  onDealTypeUpdate,
  onUnlockDeal,
  getAdjustedGrossProfit,
  formatCurrency,
  packAdjustmentEnabled,
  localPackAdjustment
}: DealRowProps) => {
  const handleSelectDeal = () => {
    // Don't allow selection of locked deals for bulk operations
    if (deal.deal_type_locked) return;
    onSelectDeal(deal.id);
  };

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleSelectDeal}
          disabled={deal.deal_type_locked}
        />
      </TableCell>
      
      <TableCell>
        <div className="font-medium text-slate-800">
          {deal.year_model || 'Unknown Vehicle'}
        </div>
      </TableCell>
      
      <TableCell>
        {deal.stock_number ? (
          <VehicleIdentifier 
            stockNumber={deal.stock_number}
            variant="badge"
            showIcon={true}
          />
        ) : (
          <span className="text-slate-500">No Stock #</span>
        )}
      </TableCell>
      
      <TableCell>
        <div className="font-medium">
          {deal.buyer_name || 'Unknown'}
        </div>
      </TableCell>
      
      <TableCell>
        <DealTypeCell
          deal={deal}
          onDealTypeUpdate={onDealTypeUpdate}
          onUnlockDeal={onUnlockDeal}
        />
      </TableCell>
      
      <TableCell>
        <div className="font-medium">
          {deal.sale_amount || '-'}
        </div>
      </TableCell>
      
      <TableCell className="text-right">
        <ProfitCell
          deal={deal}
          field="gross"
          value={getAdjustedGrossProfit(deal)}
          formatCurrency={formatCurrency}
          packAdjustmentEnabled={packAdjustmentEnabled}
          localPackAdjustment={localPackAdjustment}
        />
      </TableCell>
      
      <TableCell className="text-right">
        <ProfitCell
          deal={deal}
          field="fi"
          value={deal.fi_profit || 0}
          formatCurrency={formatCurrency}
          packAdjustmentEnabled={packAdjustmentEnabled}
          localPackAdjustment={localPackAdjustment}
        />
      </TableCell>
      
      <TableCell className="text-right">
        <ProfitCell
          deal={deal}
          field="total"
          value={deal.total_profit || 0}
          formatCurrency={formatCurrency}
          packAdjustmentEnabled={packAdjustmentEnabled}
          localPackAdjustment={localPackAdjustment}
        />
      </TableCell>
      
      <TableCell>
        <div className="text-sm">
          {new Date(deal.upload_date).toLocaleDateString()}
        </div>
        {deal.age && (
          <div className="text-xs text-slate-500">
            {deal.age} days old
          </div>
        )}
      </TableCell>
      
      <TableCell>
        <ActionsCell stockNumber={deal.stock_number} />
      </TableCell>
    </TableRow>
  );
};

export default DealRow;
