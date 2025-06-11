
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Deal {
  id: string;
  upload_date: string;
  stock_number?: string;
  year_model?: string;
  buyer_name?: string;
  gross_profit?: number;
  fi_profit?: number;
  total_profit?: number;
  deal_type?: string;
  original_gross_profit?: number;
  original_fi_profit?: number;
  original_total_profit?: number;
  first_reported_date?: string;
}

interface DealsTableProps {
  deals: Deal[];
  selectedDeals: string[];
  onSelectDeal: (dealId: string) => void;
  onSelectAll: () => void;
  onDealTypeUpdate: (dealId: string, newType: 'retail' | 'dealer_trade' | 'wholesale') => void;
  getAdjustedGrossProfit: (deal: Deal) => number;
  formatCurrency: (value?: number) => string;
  packAdjustmentEnabled: boolean;
  localPackAdjustment: number;
}

const DealsTable = ({
  deals,
  selectedDeals,
  onSelectDeal,
  onSelectAll,
  onDealTypeUpdate,
  getAdjustedGrossProfit,
  formatCurrency,
  packAdjustmentEnabled,
  localPackAdjustment
}: DealsTableProps) => {
  const getVehicleType = (stockNumber?: string): 'new' | 'used' => {
    if (!stockNumber) return 'used';
    const firstChar = stockNumber.trim().toUpperCase().charAt(0);
    return firstChar === 'C' ? 'new' : 'used';
  };

  const hasProfitChanges = (deal: Deal) => {
    return deal.original_gross_profit !== undefined && 
           (deal.gross_profit !== deal.original_gross_profit || 
            deal.fi_profit !== deal.original_fi_profit);
  };

  const getProfitChange = (current?: number, original?: number) => {
    if (current === undefined || original === undefined) return 0;
    return current - original;
  };

  const getDealTypeBadgeColor = (dealType?: string) => {
    switch (dealType) {
      case 'retail': return 'bg-green-100 text-green-800';
      case 'dealer_trade': return 'bg-blue-100 text-blue-800';
      case 'wholesale': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleTypeBadge = (stockNumber?: string) => {
    const vehicleType = getVehicleType(stockNumber);
    return vehicleType === 'new' ? 
      <Badge className="bg-blue-100 text-blue-800 text-xs">New</Badge> :
      <Badge className="bg-gray-100 text-gray-800 text-xs">Used</Badge>;
  };

  const renderProfitChangeIndicator = (deal: Deal) => {
    if (!hasProfitChanges(deal)) return null;
    
    const grossChange = getProfitChange(deal.gross_profit, deal.original_gross_profit);
    const fiChange = getProfitChange(deal.fi_profit, deal.original_fi_profit);
    const totalChange = grossChange + fiChange;
    
    return (
      <div className="flex items-center space-x-1">
        {totalChange > 0 ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
        <span className={`text-xs ${totalChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalChange > 0 ? '+' : ''}{formatCurrency(totalChange)}
        </span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-3">
              <input
                type="checkbox"
                checked={selectedDeals.length === deals.length && deals.length > 0}
                onChange={onSelectAll}
                className="rounded border-gray-300"
              />
            </th>
            <th className="text-left p-3 font-medium text-gray-600">Date</th>
            <th className="text-left p-3 font-medium text-gray-600">Stock #</th>
            <th className="text-left p-3 font-medium text-gray-600">Type</th>
            <th className="text-left p-3 font-medium text-gray-600">Vehicle</th>
            <th className="text-left p-3 font-medium text-gray-600">Customer</th>
            <th className="text-right p-3 font-medium text-gray-600">Gross Profit</th>
            <th className="text-right p-3 font-medium text-gray-600">F&I Profit</th>
            <th className="text-right p-3 font-medium text-gray-600">Total Profit</th>
            <th className="text-center p-3 font-medium text-gray-600">Changes</th>
            <th className="text-center p-3 font-medium text-gray-600">Deal Type</th>
            <th className="text-center p-3 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={selectedDeals.includes(deal.id)}
                  onChange={() => onSelectDeal(deal.id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="p-3 text-sm">
                {new Date(deal.upload_date).toLocaleDateString()}
              </td>
              <td className="p-3 text-sm font-medium">
                {deal.stock_number || '-'}
              </td>
              <td className="p-3 text-sm">
                {getVehicleTypeBadge(deal.stock_number)}
              </td>
              <td className="p-3 text-sm">
                {deal.year_model || '-'}
              </td>
              <td className="p-3 text-sm">
                {deal.buyer_name || '-'}
              </td>
              <td className="p-3 text-sm text-right">
                <div>
                  {formatCurrency(getAdjustedGrossProfit(deal))}
                  {packAdjustmentEnabled && localPackAdjustment > 0 && deal.stock_number?.toUpperCase().match(/^[BX]/) && (
                    <div className="text-xs text-green-600">
                      (+${localPackAdjustment})
                    </div>
                  )}
                  {deal.original_gross_profit && deal.gross_profit !== deal.original_gross_profit && (
                    <div className="text-xs text-gray-500">
                      Was: {formatCurrency(deal.original_gross_profit)}
                    </div>
                  )}
                </div>
              </td>
              <td className="p-3 text-sm text-right">
                <div>
                  {formatCurrency(deal.fi_profit)}
                  {deal.original_fi_profit && deal.fi_profit !== deal.original_fi_profit && (
                    <div className="text-xs text-gray-500">
                      Was: {formatCurrency(deal.original_fi_profit)}
                    </div>
                  )}
                </div>
              </td>
              <td className="p-3 text-sm text-right">
                {formatCurrency((getAdjustedGrossProfit(deal) + (deal.fi_profit || 0)))}
              </td>
              <td className="p-3 text-center">
                {renderProfitChangeIndicator(deal)}
              </td>
              <td className="p-3 text-center">
                <Badge className={getDealTypeBadgeColor(deal.deal_type)}>
                  {deal.deal_type?.replace('_', ' ') || 'retail'}
                </Badge>
              </td>
              <td className="p-3 text-center">
                <Select
                  value={deal.deal_type || 'retail'}
                  onValueChange={(value: 'retail' | 'dealer_trade' | 'wholesale') => 
                    onDealTypeUpdate(deal.id, value)
                  }
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="dealer_trade">Dealer Trade</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DealsTable;
