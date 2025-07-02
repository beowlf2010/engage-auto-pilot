import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';

interface BulkAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedSalesperson: string;
  onSalespersonChange: (value: string) => void;
  salespeople: Array<{
    id: string;
    name: string;
    activeLeads: number;
  }>;
  onAssign: () => void;
  isAssigning: boolean;
}

export const BulkAssignDialog: React.FC<BulkAssignDialogProps> = ({
  isOpen,
  onClose,
  selectedCount,
  selectedSalesperson,
  onSalespersonChange,
  salespeople,
  onAssign,
  isAssigning
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Bulk Assign Leads</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-600 mb-2">
            Assigning {selectedCount} unassigned leads
          </p>
        </div>
        
        <Select value={selectedSalesperson} onValueChange={onSalespersonChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select salesperson" />
          </SelectTrigger>
          <SelectContent>
            {salespeople.map(person => (
              <SelectItem key={person.id} value={person.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{person.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {person.activeLeads} active
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          onClick={onAssign} 
          className="w-full"
          disabled={!selectedSalesperson || isAssigning}
        >
          {isAssigning ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ArrowRight className="h-4 w-4 mr-2" />
          )}
          Assign Selected Leads
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);