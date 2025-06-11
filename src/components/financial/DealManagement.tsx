import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { updateDealType } from "@/utils/financialDataOperations";
import { supabase } from "@/integrations/supabase/client";
import PackAdjustmentControls from "./deal-management/PackAdjustmentControls";
import DealSummaryCards from "./deal-management/DealSummaryCards";
import DealFilters from "./deal-management/DealFilters";
import BulkActions from "./deal-management/BulkActions";
import DealsTable from "./deal-management/DealsTable";

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
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [bulkDealType, setBulkDealType] = useState<string>("");
  
  // Use pack adjustment from props consistently
  const [localPackAdjustment, setLocalPackAdjustment] = useState(packAdjustment);
  const [packAdjustmentEnabled, setPackAdjustmentEnabled] = useState(packAdjustment > 0);
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

  useEffect(() => {
    setLocalPackAdjustment(packAdjustment);
    setPackAdjustmentEnabled(packAdjustment > 0);
  }, [packAdjustment]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('upload_date', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      console.log('Fetched deals:', data?.length);
      console.log('Sample deal:', data?.[0]);
      
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

  const handleBulkDealTypeUpdate = async () => {
    if (selectedDeals.length === 0 || !bulkDealType) {
      toast({
        title: "Error",
        description: "Please select deals and a deal type",
        variant: "destructive"
      });
      return;
    }

    try {
      const promises = selectedDeals.map(dealId => 
        updateDealType(dealId, bulkDealType as 'retail' | 'dealer_trade' | 'wholesale')
      );
      
      await Promise.all(promises);
      
      setDeals(prevDeals => 
        prevDeals.map(deal => 
          selectedDeals.includes(deal.id) ? { ...deal, deal_type: bulkDealType } : deal
        )
      );
      
      setSelectedDeals([]);
      setBulkDealType("");
      
      toast({
        title: "Success",
        description: `Updated ${selectedDeals.length} deals`
      });
    } catch (error) {
      console.error('Error bulk updating deal types:', error);
      toast({
        title: "Error",
        description: "Failed to update deal types",
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

  const getAdjustedGrossProfit = (deal: Deal) => {
    const baseGross = deal.gross_profit || 0;
    const vehicleType = getVehicleType(deal.stock_number);
    // Apply pack adjustment to ALL used vehicles when enabled
    return vehicleType === 'used' ? baseGross + packAdjustment : baseGross;
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = !searchTerm || 
      deal.stock_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.year_model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || deal.deal_type === filterType;
    const matchesProfitFilter = !showProfitChanges || hasProfitChanges(deal);
    
    return matchesSearch && matchesFilter && matchesProfitFilter;
  });

  const calculateSummaryTotals = () => {
    const totals = {
      newRetail: { units: 0, gross: 0, fi: 0, total: 0 },
      usedRetail: { units: 0, gross: 0, fi: 0, total: 0 },
      totalRetail: { units: 0, gross: 0, fi: 0, total: 0 },
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

    // Calculate total retail (new + used retail combined)
    totals.totalRetail.units = totals.newRetail.units + totals.usedRetail.units;
    totals.totalRetail.gross = totals.newRetail.gross + totals.usedRetail.gross;
    totals.totalRetail.fi = totals.newRetail.fi + totals.usedRetail.fi;
    totals.totalRetail.total = totals.newRetail.total + totals.usedRetail.total;

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

  const handleSelectDeal = (dealId: string) => {
    setSelectedDeals(prev => 
      prev.includes(dealId) 
        ? prev.filter(id => id !== dealId)
        : [...prev, dealId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDeals.length === filteredDeals.length) {
      setSelectedDeals([]);
    } else {
      setSelectedDeals(filteredDeals.map(deal => deal.id));
    }
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
      <PackAdjustmentControls
        packAdjustmentEnabled={packAdjustmentEnabled}
        setPackAdjustmentEnabled={setPackAdjustmentEnabled}
        localPackAdjustment={localPackAdjustment}
        setLocalPackAdjustment={setLocalPackAdjustment}
      />

      <DealSummaryCards
        summaryTotals={summaryTotals}
        packAdjustmentEnabled={packAdjustmentEnabled}
        localPackAdjustment={localPackAdjustment}
        formatCurrency={formatCurrency}
      />

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
          <DealFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            showProfitChanges={showProfitChanges}
            setShowProfitChanges={setShowProfitChanges}
          />

          <BulkActions
            selectedDeals={selectedDeals}
            bulkDealType={bulkDealType}
            setBulkDealType={setBulkDealType}
            onBulkUpdate={handleBulkDealTypeUpdate}
          />

          <DealsTable
            deals={filteredDeals}
            selectedDeals={selectedDeals}
            onSelectDeal={handleSelectDeal}
            onSelectAll={handleSelectAll}
            onDealTypeUpdate={handleDealTypeUpdate}
            getAdjustedGrossProfit={getAdjustedGrossProfit}
            formatCurrency={formatCurrency}
            packAdjustmentEnabled={packAdjustmentEnabled}
            localPackAdjustment={localPackAdjustment}
          />

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
