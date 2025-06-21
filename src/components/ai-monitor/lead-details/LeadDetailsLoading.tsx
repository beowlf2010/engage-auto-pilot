
import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

interface LeadDetailsLoadingProps {
  open: boolean;
  onClose: () => void;
}

const LeadDetailsLoading: React.FC<LeadDetailsLoadingProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsLoading;
