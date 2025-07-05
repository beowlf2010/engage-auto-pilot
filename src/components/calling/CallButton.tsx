import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneCall, Clock } from "lucide-react";
import { autoDialingService } from "@/services/autoDialingService";
import { toast } from "@/hooks/use-toast";

interface CallButtonProps {
  leadId: string;
  phoneNumber: string;
  leadName?: string;
  priority?: number;
  showQueueOption?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const CallButton: React.FC<CallButtonProps> = ({
  leadId,
  phoneNumber,
  leadName = 'Lead',
  priority = 5,
  showQueueOption = true,
  variant = 'default',
  size = 'default',
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const makeDirectCall = async () => {
    setIsLoading(true);
    try {
      // First add to queue, then immediately call
      const queueId = await autoDialingService.addLeadToQueue(
        leadId,
        phoneNumber,
        1, // High priority for immediate call
      );
      
      await autoDialingService.makeCall(queueId, leadId, phoneNumber);
      
      toast({
        title: "Call Initiated",
        description: `Calling ${leadName} at ${phoneNumber}`,
      });
    } catch (error) {
      toast({
        title: "Call Failed",
        description: "Failed to initiate the call",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowOptions(false);
    }
  };

  const addToQueue = async (queuePriority: number) => {
    setIsLoading(true);
    try {
      await autoDialingService.addLeadToQueue(
        leadId,
        phoneNumber,
        queuePriority
      );
      
      const priorityLabel = queuePriority <= 2 ? 'urgent' : 
                           queuePriority <= 4 ? 'high' : 
                           queuePriority <= 6 ? 'medium' : 'low';
      
      toast({
        title: "Added to Call Queue",
        description: `${leadName} added with ${priorityLabel} priority`,
      });
    } catch (error) {
      toast({
        title: "Queue Error",
        description: "Failed to add to call queue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowOptions(false);
    }
  };

  if (!showQueueOption) {
    return (
      <Button
        onClick={makeDirectCall}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <PhoneCall className="w-4 h-4 animate-pulse" />
        ) : (
          <Phone className="w-4 h-4" />
        )}
        {size !== 'sm' && <span className="ml-1">Call</span>}
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <PhoneCall className="w-4 h-4 animate-pulse" />
        ) : (
          <Phone className="w-4 h-4" />
        )}
        {size !== 'sm' && <span className="ml-1">Call</span>}
      </Button>

      {showOptions && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-background border rounded-md shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={makeDirectCall}
              disabled={isLoading}
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Now
            </button>
            
            <div className="border-t my-1" />
            
            <div className="px-3 py-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Add to Queue:</p>
            </div>
            
            <button
              onClick={() => addToQueue(1)}
              disabled={isLoading}
              className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Urgent
              </span>
              <Badge className="bg-red-500 text-white text-xs">1</Badge>
            </button>
            
            <button
              onClick={() => addToQueue(3)}
              disabled={isLoading}
              className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                High
              </span>
              <Badge className="bg-orange-500 text-white text-xs">3</Badge>
            </button>
            
            <button
              onClick={() => addToQueue(5)}
              disabled={isLoading}
              className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Medium
              </span>
              <Badge className="bg-yellow-500 text-white text-xs">5</Badge>
            </button>
            
            <button
              onClick={() => addToQueue(8)}
              disabled={isLoading}
              className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Low
              </span>
              <Badge className="bg-green-500 text-white text-xs">8</Badge>
            </button>
          </div>
        </div>
      )}
      
      {showOptions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
};

export default CallButton;