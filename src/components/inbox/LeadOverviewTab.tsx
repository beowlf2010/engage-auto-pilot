
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Phone, 
  Car, 
  Clock,
  MessageSquare,
  Edit3,
  Save,
  X,
  Brain
} from 'lucide-react';
import LeadQuickActions from './LeadQuickActions';
import LeadActionsSection from './LeadActionsSection';
import AIStatusSection from './AIStatusSection';
import { updateVehicleInterest, updateAIFollowupLevel } from '@/services/vehicleUpdateService';

interface LeadOverviewTabProps {
  conversation: any;
  onScheduleAppointment?: () => void;
  onMarkAsLost: () => void;
  onSlowerFollowup: () => void;
  isMarkingLost: boolean;
  isSettingSlowerFollowup: boolean;
}

const LeadOverviewTab: React.FC<LeadOverviewTabProps> = ({
  conversation,
  onScheduleAppointment,
  onMarkAsLost,
  onSlowerFollowup,
  isMarkingLost,
  isSettingSlowerFollowup
}) => {
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehicleValue, setVehicleValue] = useState(conversation.vehicleInterest || '');
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [aiIntensity, setAiIntensity] = useState(conversation.messageIntensity || 'standard');
  const [isUpdatingAI, setIsUpdatingAI] = useState(false);

  const handleSaveVehicle = async () => {
    if (!vehicleValue.trim()) {
      toast({
        title: "Error",
        description: "Vehicle interest cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setIsSavingVehicle(true);
    try {
      const result = await updateVehicleInterest(conversation.leadId, vehicleValue.trim());
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Vehicle interest updated successfully",
        });
        setIsEditingVehicle(false);
        // Refresh the page to show updated data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update vehicle interest",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update vehicle interest",
        variant: "destructive"
      });
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleCancelVehicleEdit = () => {
    setVehicleValue(conversation.vehicleInterest || '');
    setIsEditingVehicle(false);
  };

  const handleAIIntensityChange = async (newIntensity: string) => {
    setIsUpdatingAI(true);
    try {
      const result = await updateAIFollowupLevel(conversation.leadId, newIntensity);
      
      if (result.success) {
        setAiIntensity(newIntensity);
        toast({
          title: "Success",
          description: `AI follow-up level changed to ${newIntensity}`,
        });
        // Refresh to show updated data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update AI follow-up level",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI follow-up level",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingAI(false);
    }
  };

  const getIntensityDescription = (intensity: string) => {
    switch (intensity) {
      case 'aggressive': return 'Daily follow-ups';
      case 'standard': return 'Every 2-3 days';
      case 'gentle': return 'Weekly follow-ups';
      case 'minimal': return 'Monthly follow-ups';
      default: return 'Standard cadence';
    }
  };

  return (
    <div className="space-y-6">
      {/* Lead Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-gray-900">{conversation.leadName}</h3>
          <Badge variant={conversation.status === 'new' ? 'default' : 'secondary'}>
            {conversation.status}
          </Badge>
        </div>

        <div className="space-y-3">
          {conversation.leadPhone && (
            <div className="flex items-center space-x-3 text-sm">
              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{conversation.leadPhone}</span>
            </div>
          )}

          {/* Editable Vehicle Interest */}
          <div className="flex items-center space-x-3 text-sm">
            <Car className="h-4 w-4 text-gray-400 flex-shrink-0" />
            {isEditingVehicle ? (
              <div className="flex-1 flex items-center space-x-2">
                <Input
                  value={vehicleValue}
                  onChange={(e) => setVehicleValue(e.target.value)}
                  placeholder="Enter vehicle interest"
                  className="h-8 text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={handleSaveVehicle}
                  disabled={isSavingVehicle}
                  className="h-8 px-3"
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleCancelVehicleEdit}
                  className="h-8 px-3"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <span className="text-gray-700">
                  {conversation.vehicleInterest || 'No vehicle specified'}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setIsEditingVehicle(true)}
                  className="h-6 px-2"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 text-sm">
            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700">Last message: {conversation.lastMessageTime}</span>
          </div>
        </div>

        {conversation.unreadCount > 0 && (
          <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <MessageSquare className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium text-red-700">
              {conversation.unreadCount} unread message{conversation.unreadCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* AI Follow-up Level Control */}
      {conversation.aiOptIn && (
        <>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-sm text-gray-700">AI Follow-up Level</h4>
            </div>
            
            <Select value={aiIntensity} onValueChange={handleAIIntensityChange} disabled={isUpdatingAI}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select intensity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aggressive">Aggressive - Daily follow-ups</SelectItem>
                <SelectItem value="standard">Standard - Every 2-3 days</SelectItem>
                <SelectItem value="gentle">Gentle - Weekly follow-ups</SelectItem>
                <SelectItem value="minimal">Minimal - Monthly follow-ups</SelectItem>
              </SelectContent>
            </Select>
            
            <p className="text-xs text-gray-500">
              Current: {getIntensityDescription(aiIntensity)}
            </p>
          </div>

          <Separator />
        </>
      )}

      <LeadQuickActions 
        onScheduleAppointment={onScheduleAppointment}
      />

      <Separator />

      <LeadActionsSection
        conversation={conversation}
        onMarkAsLost={onMarkAsLost}
        onSlowerFollowup={onSlowerFollowup}
        isMarkingLost={isMarkingLost}
        isSettingSlowerFollowup={isSettingSlowerFollowup}
      />

      <Separator />

      <AIStatusSection conversation={conversation} />
    </div>
  );
};

export default LeadOverviewTab;
