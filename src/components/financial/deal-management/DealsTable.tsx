
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Car, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import VehicleIdentifier from "@/components/shared/VehicleIdentifier";

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
  onDealTypeUpdate: (dealId: string, newType: string) => void;
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
  getAdjustedGrossProfit,
  formatCurrency,
  packAdjustmentEnabled,
  localPackAdjustment
}: DealsTableProps) => {
  const getDealTypeColor = (dealType?: string) => {
    switch (dealType?.toLowerCase()) {
      case 'retail': return 'bg-green-100 text-green-800';
      case 'wholesale': return 'bg-blue-100 text-blue-800';
      case 'dealer_trade': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const hasChangedFromOriginal = (deal: Deal, field: 'gross' | 'fi' | 'total') => {
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

  const handleSelectDeal = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    // Don't allow selection of locked deals for bulk operations
    if (deal?.deal_type_locked) return;
    onSelectDeal(dealId);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedDeals.length === deals.filter(d => !d.deal_type_locked).length && deals.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead className="font-semibold">Vehicle</TableHead>
            <TableHead className="font-semibold">Stock #</TableHead>
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Deal Type</TableHead>
            <TableHead className="font-semibold text-right">Sale Amount</TableHead>
            <TableHead className="font-semibold text-right">Gross Profit</TableHead>
            <TableHead className="font-semibold text-right">F&I Profit</TableHead>
            <TableHead className="font-semibold text-right">Total Profit</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id} className="hover:bg-slate-50">
              <TableCell>
                <Checkbox
                  checked={selectedDeals.includes(deal.id)}
                  onCheckedChange={() => handleSelectDeal(deal.id)}
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
                <div className="flex items-center space-x-2">
                  {deal.deal_type_locked ? (
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getDealTypeColor(deal.deal_type)} flex items-center space-x-1`}>
                        <Lock className="w-3 h-3" />
                        <span>{deal.deal_type?.replace('_', ' ') || 'used'}</span>
                      </Badge>
                    </div>
                  ) : (
                    <Select
                      value={deal.deal_type || 'retail'}
                      onValueChange={(value) => onDealTypeUpdate(deal.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="dealer_trade">Dealer Trade</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </TableCell>
              
              <TableCell className="text-right">
                <div className="font-semibold">
                  {deal.sale_amount ? formatCurrency(deal.sale_amount) : '-'}
                </div>
              </TableCell>
              
              <TableCell className="text-right">
                <div className="font-semibold">
                  {formatCurrency(getAdjustedGrossProfit(deal))}
                </div>
                {hasChangedFromOriginal(deal, 'gross') && (
                  <div className="text-xs text-slate-500">
                    Was: {formatCurrency(deal.original_gross_profit || 0)}
                  </div>
                )}
              </TableCell>
              
              <TableCell className="text-right">
                <div className="font-semibold">
                  {deal.fi_profit ? formatCurrency(deal.fi_profit) : '-'}
                </div>
                {hasChangedFromOriginal(deal, 'fi') && (
                  <div className="text-xs text-slate-500">
                    Was: {formatCurrency(deal.original_fi_profit || 0)}
                  </div>
                )}
              </TableCell>
              
              <TableCell className="text-right">
                <div className="font-semibold">
                  {deal.total_profit ? formatCurrency(deal.total_profit) : '-'}
                </div>
                {hasChangedFromOriginal(deal, 'total') && (
                  <div className="text-xs text-slate-500">
                    Was: {formatCurrency(deal.original_total_profit || 0)}
                  </div>
                )}
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
                <div className="flex items-center space-x-2">
                  {deal.stock_number && (
                    <Link to={`/vehicle-detail/${deal.stock_number}`}>
                      <Button variant="outline" size="sm">
                        <Car className="w-4 h-4" />
                        <span className="sr-only">View Vehicle</span>
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                    <span className="sr-only">View Deal Details</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
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
