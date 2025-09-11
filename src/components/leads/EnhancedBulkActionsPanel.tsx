import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  UserCheck, 
  UserX, 
  Trash2, 
  X,
  Mail,
  Download,
  Users,
  UserPlus,
  Settings,
  CheckSquare,
  Filter,
  MoreHorizontal
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BulkEmailAction from "./BulkEmailAction";
import EnhancedBulkAIOptIn from "./EnhancedBulkAIOptIn";
import MarkLostConfirmDialog from "./MarkLostConfirmDialog";
import { markMultipleLeadsAsLost } from "@/services/leadStatusService";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  status: string;
  vehicle_interest?: string;
  ai_opt_in?: boolean;
  city?: string;
  state?: string;
  source?: string;
  created_at?: string;
  salesperson_id?: string;
}

interface BulkActionsPanelProps {
  selectedLeads: Lead[];
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkDelete: () => void;
  onBulkMessage: () => void;
  onRefresh?: () => void;
}

const EnhancedBulkActionsPanel = ({
  selectedLeads,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkMessage,
  onRefresh,
}: BulkActionsPanelProps) => {
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isMarkingLost, setIsMarkingLost] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("");

  // Sample salesperson options (in real app, fetch from database)
  const salespersons = [
    { id: "1", name: "John Smith" },
    { id: "2", name: "Sarah Johnson" },
    { id: "3", name: "Mike Wilson" },
    { id: "4", name: "Lisa Brown" }
  ];

  if (selectedLeads.length === 0) return null;

  const handleMarkAsLost = async () => {
    setIsMarkingLost(true);
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      const result = await markMultipleLeadsAsLost(leadIds);
      
      if (result.success) {
        toast({
          title: "Leads marked as lost",
          description: `${selectedLeads.length} leads have been marked as lost and removed from all automation.`,
        });
        
        onClearSelection();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark leads as lost",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsMarkingLost(false);
      setShowMarkLostDialog(false);
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (!status) return;
    
    setIsBulkUpdating(true);
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .in('id', leadIds);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `${selectedLeads.length} leads updated to ${status.replace('_', ' ')}`,
      });

      onClearSelection();
      onBulkStatusUpdate(status);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
      setSelectedStatus("");
    }
  };

  const handleBulkSalespersonAssignment = async (salespersonId: string) => {
    if (!salespersonId) return;
    
    setIsBulkUpdating(true);
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          salesperson_id: salespersonId,
          updated_at: new Date().toISOString()
        })
        .in('id', leadIds);

      if (error) throw error;

      const salesperson = salespersons.find(s => s.id === salespersonId);
      toast({
        title: "Salesperson assigned",
        description: `${selectedLeads.length} leads assigned to ${salesperson?.name}`,
      });

      onClearSelection();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error assigning salesperson:', error);
      toast({
        title: "Error",
        description: "Failed to assign salesperson",
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
      setSelectedSalesperson("");
    }
  };

  const handleBulkAIOptIn = async (optIn: boolean) => {
    setIsBulkUpdating(true);
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: optIn,
          updated_at: new Date().toISOString()
        })
        .in('id', leadIds);

      if (error) throw error;

      toast({
        title: `AI ${optIn ? 'enabled' : 'disabled'}`,
        description: `${selectedLeads.length} leads ${optIn ? 'opted into' : 'opted out of'} AI automation`,
      });

      onClearSelection();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating AI opt-in:', error);
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const leadIds = selectedLeads.map(lead => lead.id);
      
      // Delete related phone numbers first
      await supabase
        .from('phone_numbers')
        .delete()
        .in('lead_id', leadIds);
      
      // Delete leads
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (error) throw error;

      toast({
        title: "Leads deleted",
        description: `${selectedLeads.length} leads have been permanently deleted`,
      });

      onClearSelection();
      onBulkDelete();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Error",
        description: "Failed to delete leads",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExportToCSV = async () => {
    setIsExporting(true);
    try {
      // Prepare CSV data
      const csvHeaders = [
        'First Name',
        'Last Name', 
        'Email',
        'Status',
        'Vehicle Interest',
        'City',
        'State',
        'Source',
        'AI Opt-in',
        'Created Date'
      ];

      const csvData = selectedLeads.map(lead => [
        lead.first_name || '',
        lead.last_name || '',
        lead.email || '',
        lead.status || '',
        lead.vehicle_interest || '',
        lead.city || '',
        lead.state || '',
        lead.source || '',
        lead.ai_opt_in ? 'Yes' : 'No',
        lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''
      ]);

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => 
          row.map(cell => `"${cell}"`).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `${selectedLeads.length} leads exported to CSV`,
      });
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast({
        title: "Export failed",
        description: "Unable to export leads to CSV",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAIActionComplete = () => {
    if (onRefresh) {
      onRefresh();
    }
    onClearSelection();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Selection Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-primary text-primary-foreground">
                <CheckSquare className="w-3 h-3 mr-1" />
                {selectedLeads.length} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-6 w-6 p-0 hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Primary Actions */}
          <div className="flex items-center space-x-2 flex-wrap">
            {/* Status Update */}
            <Select value={selectedStatus} onValueChange={handleBulkStatusUpdate}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="engaged">Engaged</SelectItem>
                <SelectItem value="sold_customers">Sold</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>

            {/* Salesperson Assignment */}
            <Select value={selectedSalesperson} onValueChange={handleBulkSalespersonAssignment}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Assign To" />
              </SelectTrigger>
              <SelectContent>
                {salespersons.map(person => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />
            
            {/* AI Controls */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAIOptIn(true)}
              disabled={isBulkUpdating}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Enable AI
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAIOptIn(false)}
              disabled={isBulkUpdating}
              className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
            >
              <UserX className="w-4 h-4 mr-2" />
              Disable AI
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Communication Actions */}
            <Button variant="outline" size="sm" onClick={onBulkMessage}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send SMS
            </Button>
            
            <BulkEmailAction
              selectedLeads={selectedLeads}
              onComplete={onClearSelection}
            />

            {/* Export */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportToCSV}
              disabled={isExporting}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowMarkLostDialog(true)}>
                  <UserX className="w-4 h-4 mr-2" />
                  Mark as Lost
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center space-x-6 text-xs text-muted-foreground">
            <span>Selected: {selectedLeads.length}</span>
            <span>New: {selectedLeads.filter(l => l.status === 'new').length}</span>
            <span>AI Enabled: {selectedLeads.filter(l => l.ai_opt_in).length}</span>
            <span>With Email: {selectedLeads.filter(l => l.email).length}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <MarkLostConfirmDialog
        open={showMarkLostDialog}
        onOpenChange={setShowMarkLostDialog}
        onConfirm={handleMarkAsLost}
        leadCount={selectedLeads.length}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedLeads.length} Leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected leads
              and remove all their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EnhancedBulkActionsPanel;