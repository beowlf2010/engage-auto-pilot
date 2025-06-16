
import { Table, TableBody } from "@/components/ui/table";
import DealsTableHeader from "./DealsTableHeader";
import DealRow from "./DealRow";

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

interface DealsTableProps {
  deals: Deal[];
  selectedDeals: string[];
  onSelectDeal: (dealId: string) => void;
  onSelectAll: () => void;
  onDealTypeUpdate: (dealId: string, newType: string, forceUnlock?: boolean) => void;
  onUnlockDeal: (dealId: string) => void;
  getAdjustedGrossProfit: (deal: Deal) => number;
  formatCurrency: (amount: number) => string;
  packAdjustmentEnabled: boolean;
  localPackAdjustment: number;
}

const DealsTable = ({
  deals,
  selectedDeals,
  onSelectDeal,
  onSelectAll,
  onDealTypeUpdate,
  onUnlockDeal,
  getAdjustedGrossProfit,
  formatCurrency,
  packAdjustmentEnabled,
  localPackAdjustment
}: DealsTableProps) => {
  const unlockedDealsCount = deals.filter(d => !d.deal_type_locked).length;

  return (
    <div className="rounded-md border">
      <Table>
        <DealsTableHeader
          selectedDeals={selectedDeals}
          totalDeals={deals.length}
          unlockedDeals={unlockedDealsCount}
          onSelectAll={onSelectAll}
        />
        <TableBody>
          {deals.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              isSelected={selectedDeals.includes(deal.id)}
              onSelectDeal={onSelectDeal}
              onDealTypeUpdate={onDealTypeUpdate}
              onUnlockDeal={onUnlockDeal}
              getAdjustedGrossProfit={getAdjustedGrossProfit}
              formatCurrency={formatCurrency}
              packAdjustmentEnabled={packAdjustmentEnabled}
              localPackAdjustment={localPackAdjustment}
            />
          ))}
        </TableBody>
      </Table>

      {deals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No deals found matching your criteria
        </div>
      )}
    </div>
  );
};

export default DealsTable;
