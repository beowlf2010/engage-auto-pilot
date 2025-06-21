
import React from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { User } from 'lucide-react';

interface LeadDetailsHeaderProps {
  firstName: string;
  lastName: string;
}

const LeadDetailsHeader: React.FC<LeadDetailsHeaderProps> = ({ firstName, lastName }) => {
  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <User className="h-5 w-5" />
        {firstName} {lastName}
      </DialogTitle>
      <DialogDescription>
        Lead details and contact information
      </DialogDescription>
    </DialogHeader>
  );
};

export default LeadDetailsHeader;
