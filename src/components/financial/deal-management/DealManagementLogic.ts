
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateDealType } from "@/utils/financialDataOperations";
import { useToast } from "@/hooks/use-toast";
import { Deal, SummaryTotals } from "./DealManagementTypes";

export const useDealManagement = (packAdjustment: number = 0) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showProfitChanges, setShowProfitChanges] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [bulkDealType, setBulkDealType] = useState<string>("");
  
  const [localPackAdjustment, setLocalPackAdjustment] = useState(packAdjustment);
  const [packAdjustmentEnabled, setPackAdjustmentEnabled] = useState(packAdjustment > 0);
  const { toast } = useToast();

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

  const handleSelectDeal = (dealId: string) => {
    setSelectedDeals(prev => 
      prev.includes(dealId) 
        ? prev.filter(id => id !== dealId)
        : [...prev, dealId]
    );
  };

  const handleSelectAll = (filteredDeals: Deal[]) => {
    if (selectedDeals.length === filteredDeals.length) {
      setSelectedDeals([]);
    } else {
      setSelectedDeals(filteredDeals.map(deal => deal.id));
    }
  };

  return {
    deals,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    showProfitChanges,
    setShowProfitChanges,
    selectedDeals,
    setSelectedDeals,
    bulkDealType,
    setBulkDealType,
    localPackAdjustment,
    setLocalPackAdjustment,
    packAdjustmentEnabled,
    setPackAdjustmentEnabled,
    handleDealTypeUpdate,
    handleBulkDealTypeUpdate,
    handleSelectDeal,
    handleSelectAll,
    toast
  };
};
