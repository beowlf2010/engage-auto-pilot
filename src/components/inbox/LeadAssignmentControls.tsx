
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserCheck, 
  Users, 
  UserPlus, 
  CheckSquare,
  Loader2,
  ArrowRight
} from 'lucide-react';

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
      const { error } = await supabase
        .from('leads')
        .update({ salesperson_id: salespersonId })
        .eq('id', leadId);

      if (error) throw error;
      
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
      const { error } = await supabase
        .from('leads')
        .update({ salesperson_id: selectedSalesperson })
        .in('id', selectedUnassigned);

      if (error) throw error;
      
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
      // Distribute leads evenly based on current workload
      const leadIds = unassignedConversations.map(c => c.leadId);
      const sortedSalespeople = [...salespeople].sort((a, b) => a.activeLeads - b.activeLeads);
      
      const assignments = leadIds.map((leadId, index) => {
        const salesperson = sortedSalespeople[index % sortedSalespeople.length];
        return { leadId, salespersonId: salesperson.id };
      });

      // Execute assignments in batches to avoid overwhelming the database
      for (const assignment of assignments) {
        const { error } = await supabase
          .from('leads')
          .update({ salesperson_id: assignment.salespersonId })
          .eq('id', assignment.leadId);
        
        if (error) throw error;
      }
      
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
          
          <Dialog open={showBulkAssign} onOpenChange={setShowBulkAssign}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedUnassigned.length === 0}
              >
                <CheckSquare className="h-3 w-3 mr-2" />
                Bulk Assign ({selectedUnassigned.length})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Assign Leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">
                    Assigning {selectedUnassigned.length} unassigned leads
                  </p>
                </div>
                
                <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
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
                  onClick={handleBulkAssign} 
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
        </div>

        <Separator className="my-3" />

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-600 mb-2">Quick Assign</h4>
          {unassignedConversations.slice(0, 3).map(conversation => (
            <div key={conversation.leadId} className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conversation.leadName}</p>
                <p className="text-xs text-slate-500 truncate">{conversation.vehicleInterest}</p>
              </div>
              <Select onValueChange={(value) => handleQuickAssign(conversation.leadId, value)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Assign" />
                </SelectTrigger>
                <SelectContent>
                  {salespeople.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          
          {unassignedConversations.length > 3 && (
            <p className="text-xs text-slate-500 text-center py-2">
              +{unassignedConversations.length - 3} more unassigned leads
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentControls;
