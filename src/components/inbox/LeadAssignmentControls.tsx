import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  UserCheck, 
  UserPlus, 
  CheckSquare,
  Loader2
} from 'lucide-react';
import { quickAssignLead, bulkAssignLeads, autoAssignLeads } from './assignment/AssignmentOperations';
import { BulkAssignDialog } from './assignment/BulkAssignDialog';
import { QuickAssignList } from './assignment/QuickAssignList';

interface LeadAssignmentControlsProps {
  conversations: any[];
  selectedConversations?: string[];
  onAssignmentChange: () => void;
  salespeople: Array<{
    id: string;
    name: string;
    email: string;
    activeLeads: number;
  }>;
}

const LeadAssignmentControls = ({ 
  conversations, 
  selectedConversations, 
  onAssignmentChange,
  salespeople 
}: LeadAssignmentControlsProps) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('');
  const { toast } = useToast();

  const unassignedConversations = conversations.filter(conv => !conv.salespersonId);
  const selectedUnassigned = selectedConversations?.filter(id => 
    conversations.find(conv => conv.leadId === id && !conv.salespersonId)
  ) || [];

  const handleQuickAssign = async (leadId: string, salespersonId: string) => {
    setIsAssigning(true);
    try {
      await quickAssignLead(leadId, salespersonId);
      toast({
        title: "Lead Assigned",
        description: "Lead has been successfully assigned",
      });
      onAssignmentChange();
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: "Error",
        description: "Failed to assign lead",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedSalesperson || selectedUnassigned.length === 0) return;
    
    setIsAssigning(true);
    try {
      await bulkAssignLeads(selectedUnassigned, selectedSalesperson);
      toast({
        title: "Bulk Assignment Complete",
        description: `${selectedUnassigned.length} leads assigned successfully`,
      });
      setShowBulkAssign(false);
      onAssignmentChange();
    } catch (error) {
      console.error('Bulk assignment error:', error);
      toast({
        title: "Error",
        description: "Failed to bulk assign leads",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAutoAssign = async () => {
    setIsAssigning(true);
    try {
      const leadIds = unassignedConversations.map(c => c.leadId);
      await autoAssignLeads(leadIds, salespeople);
      toast({
        title: "Auto-Assignment Complete",
        description: `${unassignedConversations.length} leads distributed automatically`,
      });
      onAssignmentChange();
    } catch (error) {
      console.error('Auto-assignment error:', error);
      toast({
        title: "Error",
        description: "Failed to auto-assign leads",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (unassignedConversations.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-orange-600" />
          Lead Assignment
          <Badge variant="secondary">
            {unassignedConversations.length} unassigned
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoAssign}
            disabled={isAssigning}
          >
            {isAssigning ? (
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-3 w-3 mr-2" />
            )}
            Auto-Assign All
          </Button>
          
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedUnassigned.length === 0}
              onClick={() => setShowBulkAssign(true)}
            >
              <CheckSquare className="h-3 w-3 mr-2" />
              Bulk Assign ({selectedUnassigned.length})
            </Button>
          </DialogTrigger>
        </div>

        <Separator className="my-3" />

        <QuickAssignList
          conversations={unassignedConversations}
          salespeople={salespeople}
          onQuickAssign={handleQuickAssign}
        />

        <BulkAssignDialog
          isOpen={showBulkAssign}
          onClose={() => setShowBulkAssign(false)}
          selectedCount={selectedUnassigned.length}
          selectedSalesperson={selectedSalesperson}
          onSalespersonChange={setSelectedSalesperson}
          salespeople={salespeople}
          onAssign={handleBulkAssign}
          isAssigning={isAssigning}
        />
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentControls;