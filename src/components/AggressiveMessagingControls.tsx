
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  MessageSquare,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { startAggressiveSequence, pauseAggressiveSequence, AGGRESSIVE_SCHEDULE } from '@/services/aggressiveMessagingService';

interface AggressiveMessagingControlsProps {
  leadId: string;
  leadName: string;
  aiStage?: string;
  aiMessagesSent?: number;
  aiSequencePaused?: boolean;
  aiPauseReason?: string;
  user: any;
  onUpdate?: () => void;
}

const AggressiveMessagingControls: React.FC<AggressiveMessagingControlsProps> = ({
  leadId,
  leadName,
  aiStage,
  aiMessagesSent = 0,
  aiSequencePaused,
  aiPauseReason,
  user,
  onUpdate
}) => {
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);

  const isAggressiveSequence = aiStage === 'aggressive_unresponsive' || aiStage === 'aggressive_paused' || aiStage === 'responded_during_aggressive';
  const totalMessages = AGGRESSIVE_SCHEDULE.reduce((sum, day) => sum + day.messagesPerDay, 0);
  const progress = isAggressiveSequence ? (aiMessagesSent / totalMessages) * 100 : 0;

  const handleStartSequence = async () => {
    setStarting(true);
    try {
      const success = await startAggressiveSequence(leadId, user);
      if (success) {
        toast({
          title: "Aggressive sequence started",
          description: `${leadName} will receive 35 messages over 14 days (3/day Week 1, 2/day Week 2)`,
        });
        onUpdate?.();
      } else {
        throw new Error('Failed to start sequence');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start aggressive messaging sequence",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const handlePauseSequence = async () => {
    setPausing(true);
    try {
      const success = await pauseAggressiveSequence(leadId, 'Manually paused by user');
      if (success) {
        toast({
          title: "Sequence paused",
          description: "Aggressive messaging sequence has been paused",
        });
        onUpdate?.();
      } else {
        throw new Error('Failed to pause sequence');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause aggressive sequence",
        variant: "destructive",
      });
    } finally {
      setPausing(false);
    }
  };

  const getStatusColor = () => {
    if (aiStage === 'responded_during_aggressive') return 'bg-green-100 text-green-800';
    if (aiSequencePaused) return 'bg-yellow-100 text-yellow-800';
    if (isAggressiveSequence) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = () => {
    if (aiStage === 'responded_during_aggressive') return <CheckCircle className="w-3 h-3 text-green-500" />;
    if (aiSequencePaused) return <Pause className="w-3 h-3 text-yellow-500" />;
    if (isAggressiveSequence) return <Flame className="w-3 h-3 text-red-500" />;
    return <MessageSquare className="w-3 h-3 text-gray-500" />;
  };

  const getStatusText = () => {
    if (aiStage === 'responded_during_aggressive') return 'Customer Responded';
    if (aiSequencePaused) return 'Paused';
    if (isAggressiveSequence) return 'Active Aggressive';
    return 'Not Started';
  };

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-red-500" />
            <span>Aggressive Messaging</span>
          </span>
          <Badge className={getStatusColor()}>
            <span className="flex items-center space-x-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isAggressiveSequence ? (
          <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-2">Super Aggressive Strategy</h4>
                <p className="text-sm text-red-700 mb-3">
                  This will send <strong>35 messages over 14 days</strong> to unresponsive leads:
                </p>
                <ul className="text-xs text-red-600 space-y-1 mb-4">
                  <li>• Week 1: 3 messages/day (9am, 1pm, 5pm CT)</li>
                  <li>• Week 2: 2 messages/day (10am, 4pm CT)</li>
                  <li>• Auto-pauses if customer responds</li>
                  <li>• Messages only between 9 AM - 6 PM Central</li>
                </ul>
                <Button 
                  onClick={handleStartSequence}
                  disabled={starting}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Flame className="w-3 h-3 mr-1" />
                  {starting ? 'Starting...' : 'Start Aggressive Sequence'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Sequence Progress</span>
                <span>{aiMessagesSent} / {totalMessages} messages</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-gray-600">
                {Math.round(progress)}% complete
              </div>
            </div>

            {/* Current Status */}
            {aiStage === 'responded_during_aggressive' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Customer Responded!</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Aggressive sequence automatically paused when customer replied
                </p>
              </div>
            )}

            {aiSequencePaused && aiStage !== 'responded_during_aggressive' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Pause className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Sequence Paused</span>
                </div>
                {aiPauseReason && (
                  <p className="text-xs text-yellow-700 mt-1">Reason: {aiPauseReason}</p>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="flex space-x-2">
              {!aiSequencePaused && aiStage !== 'responded_during_aggressive' && (
                <Button
                  onClick={handlePauseSequence}
                  disabled={pausing}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Pause className="w-3 h-3 mr-1" />
                  {pausing ? 'Pausing...' : 'Pause Sequence'}
                </Button>
              )}
            </div>

            {/* Schedule Preview */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-2">Schedule Overview</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Week 1: 21 messages (3 per day at 9am, 1pm, 5pm CT)</div>
                <div>Week 2: 14 messages (2 per day at 10am, 4pm CT)</div>
                <div className="text-red-600 font-medium mt-2">
                  ⚠️ This is an extremely aggressive strategy
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AggressiveMessagingControls;
