import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLeadDetail } from '@/hooks/useLeadDetail';
import StreamlinedLeadDetail from './detail/StreamlinedLeadDetail';
import { Loader2 } from 'lucide-react';

interface EnhancedLeadDetailModalProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
}

const EnhancedLeadDetailModal: React.FC<EnhancedLeadDetailModalProps> = ({
  leadId,
  open,
  onClose
}) => {
  const {
    lead,
    transformedLead,
    messageThreadLead,
    phoneNumbers,
    primaryPhone,
    isLoading,
    error,
    showMessageComposer,
    setShowMessageComposer,
    handlePhoneSelect,
    handleStatusChanged
  } = useLeadDetail();

  if (!open || !leadId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">
            {isLoading ? 'Loading Lead Details...' : transformedLead ? `${transformedLead.firstName} ${transformedLead.lastName}` : 'Lead Details'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-auto h-full px-6 pb-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading lead details...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-destructive font-medium mb-2">Error loading lead</p>
                <p className="text-sm text-muted-foreground">{error.message}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && lead && transformedLead && messageThreadLead && (
            <StreamlinedLeadDetail
              lead={lead}
              transformedLead={transformedLead}
              messageThreadLead={messageThreadLead}
              phoneNumbers={phoneNumbers}
              primaryPhone={primaryPhone}
              showMessageComposer={showMessageComposer}
              setShowMessageComposer={setShowMessageComposer}
              onPhoneSelect={handlePhoneSelect}
              onStatusChanged={handleStatusChanged}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedLeadDetailModal;
