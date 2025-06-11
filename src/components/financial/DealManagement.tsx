
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateDealType } from "@/utils/financialDataOperations";
import { supabase } from "@/integrations/supabase/client";

interface Deal {
  id: string;
  upload_date: string;
  stock_number?: string;
  year_model?: string;
  buyer_name?: string;
  sale_amount?: number;
  gross_profit?: number;
  fi_profit?: number;
  total_profit?: number;
  deal_type?: string;
  original_gross_profit?: number;
  original_fi_profit?: number;
  original_total_profit?: number;
  first_reported_date?: string;
}

interface DealManagementProps {
  user: {
    id: string;
    role: string;
  };
  packAdjustment?: number;
}

const DealManagement = ({ user, packAdjustment = 0 }: DealManagementProps) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showProfitChanges, setShowProfitChanges] = useState(false);
  const { toast } = useToast();

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg font-medium text-slate-800 mb-2">Access Denied</div>
          <p className="text-slate-600">Only managers and admins can manage deals</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('upload_date', { ascending: false })
        .limit(500);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDealTypeUpdate = async (dealId: string, newType: 'retail' | 'dealer_trade' | 'wholesale') => {
    try {
      await updateDealType(dealId, newType);
      
      setDeals(prevDeals => 
        prevDeals.map(deal => 
          deal.id === dealId ? { ...deal, deal_type: newType } : deal
        )
      );
      
      toast({
        title: "Success",
        description: "Deal type updated successfully"
      });
    } catch (error) {
      console.error('Error updating deal type:', error);
      toast({
        title: "Error",
        description: "Failed to update deal type",
        variant: "destructive"
      });
    }
  };

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

  const getAdjustedGrossProfit = (deal: Deal) => {
    const baseGross = deal.gross_profit || 0;
    const isUsedCar = deal.stock_number && (deal.stock_number.toUpperCase().startsWith('B') || deal.stock_number.toUpperCase().startsWith('X'));
    return isUsedCar ? baseGross - packAdjustment : baseGross;
  };

  // Define filteredDeals first
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = !searchTerm || 
      deal.stock_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.year_model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || deal.deal_type === filterType;
    const matchesProfitFilter = !showProfitChanges || hasProfitChanges(deal);
    
    return matchesSearch && matchesFilter && matchesProfitFilter;
  });

  // Calculate summary totals by category - now filteredDeals is available
  const calculateSummaryTotals = () => {
    const totals = {
      newRetail: { units: 0, gross: 0, fi: 0, total: 0 },
      usedRetail: { units: 0, gross: 0, fi: 0, total: 0 },
      dealerTrade: { units: 0, gross: 0, fi: 0, total: 0 },
      wholesale: { units: 0, gross: 0, fi: 0, total: 0 }
    };

    filteredDeals.forEach(deal => {
      const vehicleType = getVehicleType(deal.stock_number);
      const dealType = deal.deal_type || 'retail';
      const adjustedGross = getAdjustedGrossProfit(deal);
      const fiProfit = deal.fi_profit || 0;
      const totalProfit = adjustedGross + fiProfit;

      if (dealType === 'retail') {
        if (vehicleType === 'new') {
          totals.newRetail.units++;
          totals.newRetail.gross += adjustedGross;
          totals.newRetail.fi += fiProfit;
          totals.newRetail.total += totalProfit;
        } else {
          totals.usedRetail.units++;
          totals.usedRetail.gross += adjustedGross;
          totals.usedRetail.fi += fiProfit;
          totals.usedRetail.total += totalProfit;
        }
      } else if (dealType === 'dealer_trade') {
        totals.dealerTrade.units++;
        totals.dealerTrade.gross += adjustedGross;
        totals.dealerTrade.fi += fiProfit;
        totals.dealerTrade.total += totalProfit;
      } else if (dealType === 'wholesale') {
        totals.wholesale.units++;
        totals.wholesale.gross += adjustedGross;
        totals.wholesale.fi += fiProfit;
        totals.wholesale.total += totalProfit;
      }
    });

    return totals;
  };

  const summaryTotals = calculateSummaryTotals();

  const formatCurrency = (value?: number) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Retail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-600">
              {summaryTotals.newRetail.units} units
            </div>
            <div className="text-sm text-gray-600">
              Gross: {formatCurrency(summaryTotals.newRetail.gross)}
            </div>
            <div className="text-sm text-gray-600">
              F&I: {formatCurrency(summaryTotals.newRetail.fi)}
            </div>
            <div className="text-sm font-medium">
              Total: {formatCurrency(summaryTotals.newRetail.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Used Retail
              {packAdjustment > 0 && (
                <span className="text-xs text-orange-600 ml-1">
                  (Pack: ${packAdjustment})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-600">
              {summaryTotals.usedRetail.units} units
            </div>
            <div className="text-sm text-gray-600">
              Gross: {formatCurrency(summaryTotals.usedRetail.gross)}
            </div>
            <div className="text-sm text-gray-600">
              F&I: {formatCurrency(summaryTotals.usedRetail.fi)}
            </div>
            <div className="text-sm font-medium">
              Total: {formatCurrency(summaryTotals.usedRetail.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Dealer Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600">
              {summaryTotals.dealerTrade.units} units
            </div>
            <div className="text-sm text-gray-600">
              Gross: {formatCurrency(summaryTotals.dealerTrade.gross)}
            </div>
            <div className="text-sm text-gray-600">
              F&I: {formatCurrency(summaryTotals.dealerTrade.fi)}
            </div>
            <div className="text-sm font-medium">
              Total: {formatCurrency(summaryTotals.dealerTrade.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Wholesale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600">
              {summaryTotals.wholesale.units} units
            </div>
            <div className="text-sm text-gray-600">
              Gross: {formatCurrency(summaryTotals.wholesale.gross)}
            </div>
            <div className="text-sm text-gray-600">
              F&I: {formatCurrency(summaryTotals.wholesale.fi)}
            </div>
            <div className="text-sm font-medium">
              Total: {formatCurrency(summaryTotals.wholesale.total)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Deal Management</span>
            <Badge variant="secondary">{filteredDeals.length} deals</Badge>
          </CardTitle>
          <CardDescription>
            Manage deal types and view financial performance by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by stock number, customer, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="dealer_trade">Dealer Trade</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="profit-changes"
                checked={showProfitChanges}
                onChange={(e) => setShowProfitChanges(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="profit-changes" className="text-sm font-medium">
                Show Profit Changes Only
              </label>
            </div>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>

          {/* Deals Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Stock #</th>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600">Vehicle</th>
                  <th className="text-left p-3 font-medium text-gray-600">Customer</th>
                  <th className="text-right p-3 font-medium text-gray-600">Sale Amount</th>
                  <th className="text-right p-3 font-medium text-gray-600">Gross Profit</th>
                  <th className="text-right p-3 font-medium text-gray-600">F&I Profit</th>
                  <th className="text-right p-3 font-medium text-gray-600">Total Profit</th>
                  <th className="text-center p-3 font-medium text-gray-600">Changes</th>
                  <th className="text-center p-3 font-medium text-gray-600">Deal Type</th>
                  <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                      {formatCurrency(deal.sale_amount)}
                    </td>
                    <td className="p-3 text-sm text-right">
                      <div>
                        {formatCurrency(getAdjustedGrossProfit(deal))}
                        {packAdjustment > 0 && deal.stock_number?.toUpperCase().match(/^[BX]/) && (
                          <div className="text-xs text-orange-600">
                            (Adj: -${packAdjustment})
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
                          handleDealTypeUpdate(deal.id, value)
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

          {filteredDeals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No deals found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealManagement;
