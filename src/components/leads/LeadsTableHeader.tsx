
import React from 'react';
import { TableHead, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortField = 'name' | 'vehicle' | 'status' | 'salesperson' | 'engagement' | 'messages' | 'lastMessage';
type SortDirection = 'asc' | 'desc' | null;

interface LeadsTableHeaderProps {
  leadsCount: number;
  selectedLeadsCount: number;
  searchTerm: string;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onSelectAll: () => void;
}

const LeadsTableHeader = ({
  leadsCount,
  selectedLeadsCount,
  searchTerm,
  sortField,
  sortDirection,
  onSort,
  onSelectAll
}: LeadsTableHeaderProps) => {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1" /> : 
      <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const isAllSelected = selectedLeadsCount > 0 && selectedLeadsCount === leadsCount;
  const isIndeterminate = selectedLeadsCount > 0 && selectedLeadsCount < leadsCount;

  return (
    <TableRow>
      <TableHead className="w-12">
        <Checkbox
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isIndeterminate;
          }}
          onCheckedChange={onSelectAll}
        />
      </TableHead>
      
      <TableHead>
        <Button 
          variant="ghost" 
          className="font-semibold p-0 h-auto hover:bg-transparent"
          onClick={() => onSort('name')}
        >
          Lead Information
          {getSortIcon('name')}
        </Button>
      </TableHead>
      
      <TableHead>
        <Button 
          variant="ghost" 
          className="font-semibold p-0 h-auto hover:bg-transparent"
          onClick={() => onSort('vehicle')}
        >
          Vehicle Interest
          {getSortIcon('vehicle')}
        </Button>
      </TableHead>
      
      <TableHead>
        <Button 
          variant="ghost" 
          className="font-semibold p-0 h-auto hover:bg-transparent"
          onClick={() => onSort('status')}
        >
          Status
          {getSortIcon('status')}
        </Button>
      </TableHead>
      
      <TableHead>
        <Button 
          variant="ghost" 
          className="font-semibold p-0 h-auto hover:bg-transparent"
          onClick={() => onSort('salesperson')}
        >
          Salesperson
          {getSortIcon('salesperson')}
        </Button>
      </TableHead>
      
      <TableHead>
        <Button 
          variant="ghost" 
          className="font-semibold p-0 h-auto hover:bg-transparent"
          onClick={() => onSort('engagement')}
        >
          Engagement
          {getSortIcon('engagement')}
        </Button>
      </TableHead>
      
      <TableHead>AI Status</TableHead>
      
      <TableHead>
        <Button 
          variant="ghost" 
          className="font-semibold p-0 h-auto hover:bg-transparent"
          onClick={() => onSort('messages')}
        >
          Messages
          {getSortIcon('messages')}
        </Button>
      </TableHead>
      
      <TableHead>
        <Button 
          variant="ghost" 
          className="font-semibold p-0 h-auto hover:bg-transparent"
          onClick={() => onSort('lastMessage')}
        >
          Last Message
          {getSortIcon('lastMessage')}
        </Button>
      </TableHead>
      
      <TableHead>Actions</TableHead>
    </TableRow>
  );
};

export default LeadsTableHeader;
