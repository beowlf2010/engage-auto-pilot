
import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

interface LeadDetailsErrorProps {
  open: boolean;
  onClose: () => void;
}

const LeadDetailsError: React.FC<LeadDetailsErrorProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="text-center p-8">
          <p>Lead details not found</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsError;
