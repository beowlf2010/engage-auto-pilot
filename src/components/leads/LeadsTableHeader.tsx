
import React from 'react';
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface LeadsTableHeaderProps {
  leads: any[];
  selectedLeads: string[];
  onSelectAll: (checked: boolean) => void;
}

const LeadsTableHeader = ({ leads, selectedLeads, onSelectAll }: LeadsTableHeaderProps) => {
  const handleSelectAll = (checked: boolean) => {
    onSelectAll(checked);
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <Checkbox
            checked={selectedLeads.length === leads.length && leads.length > 0}
            onCheckedChange={handleSelectAll}
          />
        </TableHead>
        <TableHead>Lead</TableHead>
        <TableHead>Contact</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Vehicle Interest</TableHead>
        <TableHead>Source</TableHead>
        <TableHead>Created</TableHead>
        <TableHead>Score</TableHead>
        <TableHead>AI</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default LeadsTableHeader;
