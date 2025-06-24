
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Settings, Target, MessageSquare, User, Phone, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import EnhancedProcessSelector from '@/components/processes/EnhancedProcessSelector';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { LeadDetailData } from '@/services/leadDetailService';

interface LeadDetailSidebarProps {
  lead: LeadDetailData;
  onAIOptInChange: (enabled: boolean) => void;
  onMessageSent: () => void;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({
  lead,
  onAIOptInChange,
  onMessageSent
}) => {
  const [showProcessSelector, setShowProcessSelector] = useState(false);

  const handleProcessAssigned = (processId: string, logic: any) => {
    console.log('Process assigned:', processId, logic);
    setShowProcessSelector(false);
    onMessageSent(); // Refresh data
  };

  return (
    <div className="w-80 space-y-4">
      {/* Enhanced Process Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Process System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Current Process:</span>
              <Badge variant="outline">Not Assigned</Badge>
            </div>
            <div className="text-xs text-gray-600 mb-3">
              Assign an intelligent messaging process based on lead characteristics
            </div>
          </div>

          <Sheet open={showProcessSelector} onOpenChange={setShowProcessSelector}>
            <SheetTrigger asChild>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Target className="h-4 w-4 mr-2" />
                Assign Enhanced Process
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[600px]">
              <SheetHeader>
                <SheetTitle>Enhanced Process Assignment</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <EnhancedProcessSelector
                  leadId={lead.id}
                  leadSource={lead.source}
                  leadType={lead.leadTypeName}
                  leadStatus={lead.status}
                  onProcessAssigned={handleProcessAssigned}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div className="text-xs text-purple-600 bg-purple-100 rounded p-2">
            <strong>Enhanced Features:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Smart source bucket detection</li>
              <li>• Lead type overlay messaging</li>
              <li>• Dynamic aggression levels</li>
              <li>• Optimal timing windows</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Lead Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-gray-500" />
              <span className="font-medium">
                {lead.firstName} {lead.lastName}
              </span>
            </div>
            
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-gray-500" />
                <span className="text-gray-600">{lead.email}</span>
              </div>
            )}
            
            {lead.primaryPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-gray-500" />
                <span className="text-gray-600">{lead.primaryPhone}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">
                Created {format(new Date(lead.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {lead.conversations.length}
              </div>
              <div className="text-xs text-gray-600">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {lead.conversations.filter(c => c.direction === 'in').length}
              </div>
              <div className="text-xs text-gray-600">Responses</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Interest */}
      {lead.vehicleInterest && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Vehicle Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div className="font-medium">{lead.vehicleInterest}</div>
              {lead.vehicleYear && lead.vehicleMake && lead.vehicleModel && (
                <div className="text-gray-600 mt-1">
                  {lead.vehicleYear} {lead.vehicleMake} {lead.vehicleModel}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">AI Opt-In</span>
            <Badge variant={lead.aiOptIn ? "default" : "secondary"}>
              {lead.aiOptIn ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Message Intensity</span>
            <Badge variant="outline">
              {lead.messageIntensity || 'standard'}
            </Badge>
          </div>
          
          {lead.aiStage && (
            <div className="flex items-center justify-between">
              <span className="text-sm">AI Stage</span>
              <Badge variant="outline">
                {lead.aiStage}
              </Badge>
            </div>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => onAIOptInChange(!lead.aiOptIn)}
          >
            {lead.aiOptIn ? 'Disable' : 'Enable'} AI
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadDetailSidebar;
