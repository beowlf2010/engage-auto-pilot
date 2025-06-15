
import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, MessageSquare, Edit, MoreHorizontal } from "lucide-react";
import { Lead } from "@/types/lead";

interface LeadActionsDropdownProps {
  lead: Lead;
  canEdit: boolean;
  onQuickView: (lead: Lead) => void;
  handleMessageClick: (lead: Lead) => void;
}

const LeadActionsDropdown: React.FC<LeadActionsDropdownProps> = ({
  lead,
  canEdit,
  onQuickView,
  handleMessageClick,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onQuickView(lead)}>
          <Eye className="w-4 h-4 mr-2" />
          Quick View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleMessageClick(lead)}
          disabled={lead.doNotCall}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Message
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LeadActionsDropdown;
