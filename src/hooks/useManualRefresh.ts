
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseManualRefreshProps {
  onRefresh: () => Promise<void> | void;
  refreshMessage?: string;
}

export const useManualRefresh = ({ onRefresh, refreshMessage = "Data refreshed successfully" }: UseManualRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log('🔄 Manual refresh initiated');
    
    try {
      await onRefresh();
      toast({
        title: "Refresh Complete",
        description: refreshMessage,
      });
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh, refreshMessage, toast]);

  return {
    handleRefresh,
    isRefreshing
  };
};
