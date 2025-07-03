import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateDealType, unlockDeal } from "@/utils/financial/dealOperations";
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
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [dateField, setDateField] = useState<string>("upload_date");
  
  const { toast } = useToast();

  useEffect(() => {
    fetchDeals();
  }, [dateFilter, customStartDate, customEndDate, dateField]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      
      // Build date filter conditions with inventory join
      let query = supabase
        .from('deals')
        .select(`
          *,
          inventory:inventory!left(year, make, model, trim, status)
        `);

      // Apply date filtering based on selected filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: string | null = null;
        let endDate: string | null = null;

        switch (dateFilter) {
          case 'month_to_date':
            startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            endDate = now.toISOString().split('T')[0];
            break;
          case 'previous_month':
            const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            startDate = prevMonth.toISOString().split('T')[0];
            endDate = lastDayPrevMonth.toISOString().split('T')[0];
            break;
          case 'year_to_date':
            startDate = `${now.getFullYear()}-01-01`;
            endDate = now.toISOString().split('T')[0];
            break;
          case 'last_30_days':
            const thirty = new Date(now);
            thirty.setDate(thirty.getDate() - 30);
            startDate = thirty.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
          case 'last_90_days':
            const ninety = new Date(now);
            ninety.setDate(ninety.getDate() - 90);
            startDate = ninety.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
          case 'custom':
            startDate = customStartDate;
            endDate = customEndDate;
            break;
        }

        if (startDate && endDate) {
          query = query
            .gte(dateField, startDate)
            .lte(dateField, endDate);
        }
      }

      const { data, error } = await query
        .order('upload_date', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      console.log('Fetched deals:', data?.length);
      console.log('Date filter applied:', dateFilter, 'Field:', dateField);
      
      // Transform the data to handle Json type for assigned_managers and inventory array
      const transformedDeals = (data || []).map(deal => ({
        ...deal,
        assigned_managers: Array.isArray(deal.assigned_managers) 
          ? deal.assigned_managers 
          : deal.assigned_managers 
            ? JSON.parse(deal.assigned_managers as string)
            : [],
        inventory: deal.inventory ? [deal.inventory] : []
      })) as Deal[];
      
      setDeals(transformedDeals);
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

  const handleDealTypeUpdate = async (dealId: string, newType: 'retail' | 'dealer_trade' | 'wholesale', forceUnlock: boolean = false) => {
    try {
      await updateDealType(dealId, newType, forceUnlock);
      
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

  const handleUnlockDeal = async (dealId: string) => {
    try {
      await unlockDeal(dealId);
      
      setDeals(prevDeals => 
        prevDeals.map(deal => 
          deal.id === dealId ? { 
            ...deal, 
            deal_type_locked: false
          } : deal
        )
      );
      
      toast({
        title: "Success",
        description: "Deal unlocked successfully"
      });
    } catch (error) {
      console.error('Error unlocking deal:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unlock deal",
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

  const handleManagersUpdate = async (dealId: string, managerIds: string[]) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ assigned_managers: managerIds })
        .eq('id', dealId);

      if (error) throw error;

      setDeals(prevDeals => 
        prevDeals.map(deal => 
          deal.id === dealId ? { 
            ...deal, 
            assigned_managers: managerIds
          } : deal
        )
      );

      toast({
        title: "Success",
        description: "Managers updated successfully"
      });
    } catch (error) {
      console.error('Error updating managers:', error);
      toast({
        title: "Error",
        description: "Failed to update managers",
        variant: "destructive"
      });
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
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateField,
    setDateField,
    handleDealTypeUpdate,
    handleUnlockDeal,
    handleBulkDealTypeUpdate,
    handleSelectDeal,
    handleSelectAll,
    handleManagersUpdate,
    toast
  };
};
