
import React from "react";
import { TableRow, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortField = 'name' | 'status' | 'contactStatus' | 'createdAt' | 'lastMessage' | 'engagementScore';
type SortDirection = 'asc' | 'desc';

interface LeadsTableHeaderProps {
  leadsCount: number;
  selectedLeadsCount: number;
  searchTerm: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onSelectAll: (checked: boolean) => void;
}

const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => {
  if (!active) return <ArrowUpDown className="w-4 h-4" />;
  return direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
};

const LeadsTableHeader: React.FC<LeadsTableHeaderProps> = ({
  leadsCount,
  selectedLeadsCount,
  sortField,
  sortDirection,
  onSort,
  onSelectAll,
}) => (
  <TableRow>
    <TableHead className="w-12">
      <Checkbox
        checked={selectedLeadsCount === leadsCount && leadsCount > 0}
        onCheckedChange={onSelectAll}
      />
    </TableHead>
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort('name')}
        className="h-auto p-0 font-medium"
      >
        Name{" "}
        <SortIcon active={sortField === 'name'} direction={sortDirection} />
      </Button>
    </TableHead>
    <TableHead>Phone</TableHead>
    <TableHead>Email</TableHead>
    <TableHead>Vehicle Interest</TableHead>
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort('status')}
        className="h-auto p-0 font-medium"
      >
        Status{" "}
        <SortIcon active={sortField === 'status'} direction={sortDirection} />
      </Button>
    </TableHead>
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort('contactStatus')}
        className="h-auto p-0 font-medium"
      >
        Contact{" "}
        <SortIcon active={sortField === 'contactStatus'} direction={sortDirection} />
      </Button>
    </TableHead>
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort('engagementScore')}
        className="h-auto p-0 font-medium"
      >
        Score{" "}
        <SortIcon active={sortField === 'engagementScore'} direction={sortDirection} />
      </Button>
    </TableHead>
    <TableHead>Finn AI</TableHead>
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort('lastMessage')}
        className="h-auto p-0 font-medium"
      >
        Last Contact{" "}
        <SortIcon active={sortField === 'lastMessage'} direction={sortDirection} />
      </Button>
    </TableHead>
    <TableHead className="w-24">Actions</TableHead>
  </TableRow>
);

export default LeadsTableHeader;
