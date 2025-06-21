
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Phone, MessageSquare, RefreshCw } from 'lucide-react';
import { fixLeadAIStage, fixAllStuckLeads, fixLeadsWithPlaceholderPhones } from '@/services/aiStageFixService';
import { useToast } from '@/hooks/use-toast';

const LeadStatusFixPanel = () => {
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const handleFixStuckLeads = async () => {
    setIsFixing(true);
    try {
      await fixAllStuckLeads();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fix stuck leads",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleFixPlaceholderPhones = async () => {
    setIsFixing(true);
    try {
      await fixLeadsWithPlaceholderPhones();
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to fix placeholder phone numbers",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Lead Status Fixes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-orange-900">Stuck AI Sequences</h4>
                <p className="text-sm text-orange-700">
                  Fix leads with stuck AI stages or empty message loops
                </p>
              </div>
              <Button 
                onClick={handleFixStuckLeads}
                disabled={isFixing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFixing ? 'animate-spin' : ''}`} />
                Fix Stuck Leads
              </Button>
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-red-900">Placeholder Phone Numbers</h4>
                <p className="text-sm text-red-700">
                  Find and pause leads with placeholder phone numbers (+15551234567)
                </p>
              </div>
              <Button 
                onClick={handleFixPlaceholderPhones}
                disabled={isFixing}
                variant="outline"
                size="sm"
              >
                <Phone className={`h-4 w-4 mr-2 ${isFixing ? 'animate-spin' : ''}`} />
                Fix Phone Numbers
              </Button>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Common Issues Fixed:</span>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">Empty message loops</Badge>
              <Badge variant="outline" className="text-xs">Stuck AI stages</Badge>
              <Badge variant="outline" className="text-xs">Missing phone numbers</Badge>
              <Badge variant="outline" className="text-xs">Failed message delivery</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadStatusFixPanel;
