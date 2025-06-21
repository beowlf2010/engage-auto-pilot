
import React from 'react';
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ExternalLink } from 'lucide-react';

interface LeadDetailsFooterProps {
  onClose: () => void;
  onNavigateToLead: () => void;
}

const LeadDetailsFooter: React.FC<LeadDetailsFooterProps> = ({ onClose, onNavigateToLead }) => {
  return (
    <>
      <Separator />
      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onNavigateToLead} className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          View Full Lead Details
        </Button>
      </div>
    </>
  );
};

export default LeadDetailsFooter;
