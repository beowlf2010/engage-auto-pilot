
import { useState } from 'react';
import { learningBackfillService } from '@/services/learningDataBackfill';
import { toast } from '@/hooks/use-toast';

export const useLearningBackfill = () => {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{
    processed: number;
    responses: number;
  } | null>(null);

  const startBackfill = async (limit: number = 100) => {
    setIsBackfilling(true);
    setBackfillProgress(null);
    
    try {
      console.log('🚀 [BACKFILL] Starting learning data backfill...');
      
      // Backfill historical conversation data
      const result = await learningBackfillService.backfillHistoricalData(limit);
      setBackfillProgress(result);
      
      // Update template performance
      await learningBackfillService.updateTemplatePerformance();
      
      toast({
        title: "Backfill Complete",
        description: `Processed ${result.processed} messages, found ${result.responses} responses`,
      });
      
      console.log('✅ [BACKFILL] Learning data backfill completed successfully');
      
    } catch (error) {
      console.error('❌ [BACKFILL] Error during backfill:', error);
      toast({
        title: "Backfill Failed",
        description: error instanceof Error ? error.message : "Failed to backfill learning data",
        variant: "destructive"
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return {
    isBackfilling,
    backfillProgress,
    startBackfill
  };
};
