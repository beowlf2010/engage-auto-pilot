
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import VehicleIdentifier from "@/components/shared/VehicleIdentifier";
import DealTypeCell from "./DealTypeCell";
import ProfitCell from "./ProfitCell";
import PackAdjustmentCell from "./PackAdjustmentCell";
import ActionsCell from "./ActionsCell";
import CustomerNameLink from "./CustomerNameLink";
import ManagerSelection from "./ManagerSelection";
import { getAdjustedTotalProfit } from "./DealManagementUtils";

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
  assigned_managers?: string[];
  inventory?: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    status?: string;
  }[];
}

interface DealRowProps {
  deal: Deal;
  isSelected: boolean;
  onSelectDeal: (dealId: string) => void;
  onDealTypeUpdate: (dealId: string, newType: string, forceUnlock?: boolean) => void;
  onUnlockDeal: (dealId: string) => void;
  onManagersUpdate: (dealId: string, managerIds: string[]) => void;
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
  onManagersUpdate,
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

  const adjustedTotalProfit = getAdjustedTotalProfit(deal, localPackAdjustment);

  // Get vehicle description from inventory data or fallback
  const getVehicleDescription = () => {
    const inventoryItem = deal.inventory?.[0];
    if (inventoryItem && inventoryItem.year && inventoryItem.make && inventoryItem.model) {
      const parts = [
        inventoryItem.year,
        inventoryItem.make,
        inventoryItem.model,
        inventoryItem.trim
      ].filter(Boolean);
      return parts.join(' ');
    }
    
    // Fallback to year_model if available
    if (deal.year_model) {
      return deal.year_model;
    }
    
    // Last fallback - show stock number if available
    if (deal.stock_number) {
      return `Vehicle ${deal.stock_number}`;
    }
    
    return 'Unknown Vehicle';
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
          {getVehicleDescription()}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="space-y-1">
          {deal.stock_number ? (
            <VehicleIdentifier 
              stockNumber={deal.stock_number}
              variant="badge"
              showIcon={true}
            />
          ) : (
            <span className="text-slate-500 text-xs">No Stock #</span>
          )}
          {deal.inventory?.[0]?.status && (
            <Badge 
              variant={deal.inventory[0].status === 'sold' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {deal.inventory[0].status}
            </Badge>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        <CustomerNameLink customerName={deal.buyer_name || 'Unknown'} />
      </TableCell>
      
      <TableCell>
        <DealTypeCell
          deal={deal}
          onDealTypeUpdate={onDealTypeUpdate}
          onUnlockDeal={onUnlockDeal}
        />
      </TableCell>
      
      <TableCell>
        <ManagerSelection
          dealId={deal.id}
          assignedManagerIds={deal.assigned_managers || []}
          onManagersUpdate={onManagersUpdate}
        />
      </TableCell>
      
      <TableCell className="text-right">
        <ProfitCell
          deal={deal}
          field="gross"
          value={deal.gross_profit || 0}
          formatCurrency={formatCurrency}
          packAdjustmentEnabled={packAdjustmentEnabled}
          localPackAdjustment={0}
        />
      </TableCell>
      
      <TableCell className="text-right">
        <PackAdjustmentCell
          deal={deal}
          packAdjustmentEnabled={packAdjustmentEnabled}
          localPackAdjustment={localPackAdjustment}
          formatCurrency={formatCurrency}
        />
      </TableCell>
      
      <TableCell className="text-right">
        <ProfitCell
          deal={deal}
          field="fi"
          value={deal.fi_profit || 0}
          formatCurrency={formatCurrency}
          packAdjustmentEnabled={packAdjustmentEnabled}
          localPackAdjustment={0}
        />
      </TableCell>
      
      <TableCell className="text-right">
        <ProfitCell
          deal={deal}
          field="total"
          value={adjustedTotalProfit}
          formatCurrency={formatCurrency}
          packAdjustmentEnabled={packAdjustmentEnabled}
          localPackAdjustment={0}
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
