
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DollarSign, Calendar, User, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Deal {
  id: string;
  upload_date: string;
  sale_amount?: number;
  gross_profit?: number;
  total_profit?: number;
  deal_type?: string;
  buyer_name?: string;
}

interface DealHistoryProps {
  deals: Deal[];
  stockNumber?: string;
}

const DealHistory = ({ deals, stockNumber }: DealHistoryProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDealTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'retail': return 'bg-green-100 text-green-800';
      case 'wholesale': return 'bg-blue-100 text-blue-800';
      case 'dealer_trade': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (deals.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-800">Deal History</h3>
          <Badge variant="outline">No deals</Badge>
        </div>
        <div className="text-center py-6">
          <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">No deals found for this vehicle</p>
          {stockNumber && (
            <Link to={`/financial-dashboard?search=${stockNumber}`}>
              <Button variant="outline" size="sm">
                Create Deal
              </Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-800">Deal History</h3>
        <Badge variant="outline">{deals.length} deals</Badge>
      </div>
      
      <div className="space-y-4">
        {deals.map((deal) => (
          <div key={deal.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium">
                  {formatDistanceToNow(new Date(deal.upload_date), { addSuffix: true })}
                </span>
                {deal.deal_type && (
                  <Badge className={getDealTypeColor(deal.deal_type)}>
                    {deal.deal_type.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <Link to={`/financial-dashboard?search=${stockNumber}`}>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {deal.sale_amount && (
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-3 h-3 text-green-600" />
                  <span className="text-slate-600">Sale:</span>
                  <span className="font-medium">{formatCurrency(deal.sale_amount)}</span>
                </div>
              )}
              
              {deal.gross_profit && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-blue-600" />
                  <span className="text-slate-600">Gross:</span>
                  <span className="font-medium">{formatCurrency(deal.gross_profit)}</span>
                </div>
              )}
              
              {deal.total_profit && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-purple-600" />
                  <span className="text-slate-600">Total:</span>
                  <span className="font-medium">{formatCurrency(deal.total_profit)}</span>
                </div>
              )}
              
              {deal.buyer_name && (
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-600">Buyer:</span>
                  <span className="font-medium">{deal.buyer_name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <Link to={`/financial-dashboard?search=${stockNumber}`}>
          <Button variant="outline" className="w-full">
            View All Deals & Financial Details
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export default DealHistory;
