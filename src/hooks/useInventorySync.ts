
import { useEffect } from 'react';
import { syncInventoryData } from '@/services/inventoryService';

interface UseInventorySyncProps {
  uploadId?: string;
  uploadSuccess?: boolean;
}

export const useInventorySync = ({ uploadId, uploadSuccess }: UseInventorySyncProps) => {
  useEffect(() => {
    if (uploadSuccess && uploadId) {
      // Trigger sync after a brief delay to ensure upload is complete
      const syncTimeout = setTimeout(() => {
        syncInventoryData(uploadId);
      }, 2000);

      return () => clearTimeout(syncTimeout);
    }
  }, [uploadId, uploadSuccess]);
};
