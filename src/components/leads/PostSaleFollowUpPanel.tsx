import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, MessageCircle, TrendingUp, Eye } from 'lucide-react';
import { soldCustomerService } from '@/services/soldCustomerService';
import { initializePostSaleProcesses } from '@/services/postSaleProcesses';
import { toast } from '@/hooks/use-toast';

interface PostSaleFollowUpPanelProps {
  selectedLeadIds: string[];
  onProcessAssigned?: () => void;
}

const PostSaleFollowUpPanel: React.FC<PostSaleFollowUpPanelProps> = ({
  selectedLeadIds,
  onProcessAssigned
}) => {
  const [loading, setLoading] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [soldCustomersCount, setSoldCustomersCount] = useState(0);

  // Load sold customers count on component mount
  useEffect(() => {
    const loadSoldCustomersCount = async () => {
      try {
        const soldLeads = await soldCustomerService.getSoldCustomerLeads();
        setSoldCustomersCount(soldLeads.length);
      } catch (error) {
        console.error('Error loading sold customers count:', error);
      }
    };

    loadSoldCustomersCount();
  }, []);

  const handleInitializePostSaleProcess = async () => {
    setLoading(true);
    try {
      await initializePostSaleProcesses();
      toast({
        title: "Process Initialized",
        description: "Post-sale customer follow-up process has been created successfully.",
      });
    } catch (error) {
      console.error('Error initializing post-sale process:', error);
      toast({
        title: "Error",
        description: "Failed to initialize post-sale process",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssignSoldCustomers = async () => {
    setAutoAssigning(true);
    try {
      const result = await soldCustomerService.autoAssignSoldCustomers();
      
      if (result.assigned > 0) {
        toast({
          title: "Auto-Assignment Complete",
          description: `Successfully assigned ${result.assigned} sold customers to post-sale follow-up process.`,
        });
        
        if (result.errors.length > 0) {
          console.warn('Some assignments had errors:', result.errors);
        }
        
        // Refresh the sold customers count
        const soldLeads = await soldCustomerService.getSoldCustomerLeads();
        setSoldCustomersCount(soldLeads.length);
        
        onProcessAssigned?.();
      } else {
        toast({
          title: "No Customers Found",
          description: "No sold customers found that need assignment to post-sale follow-up.",
        });
      }
    } catch (error) {
      console.error('Error auto-assigning sold customers:', error);
      toast({
        title: "Error",
        description: "Failed to auto-assign sold customers",
        variant: "destructive"
      });
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleViewSoldCustomers = () => {
    // Navigate to the sold customers tab
    const event = new CustomEvent('navigateToSoldCustomers');
    window.dispatchEvent(event);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-green-600" />
          Post-Sale Customer Follow-Up
          {soldCustomersCount > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {soldCustomersCount} sold customers found
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800 mb-1">Gentle Follow-Up Process</h4>
              <p className="text-sm text-green-700 mb-3">
                Non-sales focused follow-up for sold customers emphasizing satisfaction, 
                service reminders, and gentle referral requests.
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-800">Schedule:</span>
                  <ul className="text-green-700 mt-1 space-y-1">
                    <li>• Day 7: Thank you + satisfaction check</li>
                    <li>• Day 30: Service reminder + soft referral ask</li>
                    <li>• Day 90: Check-in + review request</li>
                    <li>• Day 180: Service + relationship maintenance</li>
                  </ul>
                </div>
                <div>
                  <span className="font-medium text-green-800">Features:</span>
                  <ul className="text-green-700 mt-1 space-y-1">
                    <li>• <Badge variant="outline" className="text-xs">Gentle Tone</Badge></li>
                    <li>• <Badge variant="outline" className="text-xs">No Sales Pressure</Badge></li>
                    <li>• <Badge variant="outline" className="text-xs">Referral Focus</Badge></li>
                    <li>• <Badge variant="outline" className="text-xs">Service Reminders</Badge></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button 
              onClick={handleInitializePostSaleProcess}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="h-4 w-4" />
              {loading ? 'Initializing...' : 'Initialize Post-Sale Process'}
            </Button>

            {soldCustomersCount > 0 && (
              <Button 
                onClick={handleViewSoldCustomers}
                variant="outline"
                className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
              >
                <Eye className="h-4 w-4" />
                View Sold Customers ({soldCustomersCount})
              </Button>
            )}
          </div>

          <Button 
            onClick={handleAutoAssignSoldCustomers}
            disabled={autoAssigning || soldCustomersCount === 0}
            variant="outline"
            className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
          >
            <Users className="h-4 w-4" />
            {autoAssigning ? 'Auto-Assigning...' : `Auto-Assign Sold Customers (${soldCustomersCount})`}
          </Button>
        </div>

        {selectedLeadIds.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm text-gray-600 mb-2">
              <strong>Note:</strong> Selected leads can be manually assigned to the post-sale 
              process using the main Process Management panel above.
            </div>
            <div className="text-xs text-gray-500">
              {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PostSaleFollowUpPanel;
