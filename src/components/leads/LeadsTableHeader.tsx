
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
        <TableHead>Contact Info</TableHead>
        <TableHead>Vehicle Interest</TableHead>
        <TableHead>Source</TableHead>
        <TableHead>Lead Age</TableHead>
        <TableHead>Source Strategy</TableHead>
        <TableHead>AI Sequence</TableHead>
        <TableHead>Messages</TableHead>
        <TableHead>Last Activity</TableHead>
        <TableHead>Engagement</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>AI Enabled</TableHead>
        <TableHead>Data Quality</TableHead>
        <TableHead>Do Not Contact</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default LeadsTableHeader;
