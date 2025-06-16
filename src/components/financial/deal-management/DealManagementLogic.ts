
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateDealType } from "@/utils/financial/dealOperations";
import { useToast } from "@/hooks/use-toast";
import { Deal } from "./DealManagementTypes";

export const useDealManagement = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showProfitChanges, setShowProfitChanges] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [bulkDealType, setBulkDealType] = useState<string>("");
  
  const { toast } = useToast();

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
      
      // Determine if the new type should be locked
      const shouldLock = ['wholesale', 'dealer_trade'].includes(newType);
      
      setDeals(prevDeals => 
        prevDeals.map(deal => 
          deal.id === dealId ? { 
            ...deal, 
            deal_type: newType,
            deal_type_locked: shouldLock
          } : deal
        )
      );
      
      toast({
        title: "Success",
        description: shouldLock 
          ? `Deal type updated to ${newType} and locked` 
          : "Deal type updated successfully"
      });
    } catch (error) {
      console.error('Error updating deal type:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update deal type",
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

    // Filter out locked deals
    const lockedDeals = deals.filter(deal => 
      selectedDeals.includes(deal.id) && deal.deal_type_locked
    );

    if (lockedDeals.length > 0) {
      toast({
        title: "Warning",
        description: `${lockedDeals.length} deals are locked and cannot be changed`,
        variant: "destructive"
      });
      return;
    }

    try {
      const promises = selectedDeals.map(dealId => 
        updateDealType(dealId, bulkDealType as 'retail' | 'dealer_trade' | 'wholesale')
      );
      
      await Promise.all(promises);
      
      const shouldLock = ['wholesale', 'dealer_trade'].includes(bulkDealType);
      
      setDeals(prevDeals => 
        prevDeals.map(deal => 
          selectedDeals.includes(deal.id) ? { 
            ...deal, 
            deal_type: bulkDealType,
            deal_type_locked: shouldLock
          } : deal
        )
      );
      
      setSelectedDeals([]);
      setBulkDealType("");
      
      toast({
        title: "Success",
        description: `Updated ${selectedDeals.length} deals${shouldLock ? ' and locked them' : ''}`
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
    handleDealTypeUpdate,
    handleBulkDealTypeUpdate,
    handleSelectDeal,
    handleSelectAll,
    toast
  };
};
