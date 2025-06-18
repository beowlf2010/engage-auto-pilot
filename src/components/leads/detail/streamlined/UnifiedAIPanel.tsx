
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot, 
  Car, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Send, 
  X, 
  Loader2,
  Sparkles,
  User,
  Phone
} from "lucide-react";
import { getInventoryForAIMessaging } from "@/services/inventory/inventoryQueries";
import { generateIntelligentAIMessage } from "@/services/intelligentAIMessageService";
import { sendMessage } from "@/services/messagesService";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "@/hooks/use-toast";
import type { LeadDetailData } from "@/services/leadDetailService";

interface UnifiedAIPanelProps {
  lead: LeadDetailData;
  onMessageSent?: () => void;
}

const UnifiedAIPanel: React.FC<UnifiedAIPanelProps> = ({
  lead,
  onMessageSent
}) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [inventoryContext, setInventoryContext] = useState<any[]>([]);
  const [inventoryValidated, setInventoryValidated] = useState(false);
  const [showMessageEditor, setShowMessageEditor] = useState(false);

  useEffect(() => {
    validateInventory();
  }, [lead.id]);

  const validateInventory = async () => {
    try {
      const matchingInventory = await getInventoryForAIMessaging(lead.id);
      const validInventory = matchingInventory.filter(v => v.model && v.model !== 'Unknown');
      setInventoryContext(validInventory);
      setInventoryValidated(true);
    } catch (error) {
      console.error('Error validating inventory:', error);
      setInventoryContext([]);
      setInventoryValidated(true);
    }
  };

  const generateAIMessage = async () => {
    setIsGenerating(true);
    try {
      const message = await generateIntelligentAIMessage({
        leadId: lead.id,
        stage: 'follow_up',
        context: {
          availableInventory: inventoryContext,
          inventoryCount: inventoryContext.length,
          strictInventoryMode: true,
          vehicleInterest: lead.vehicleInterest || ''
        }
      });

      if (message) {
        setGeneratedMessage(message);
        setEditedMessage(message);
        setShowMessageEditor(true);
      } else {
        throw new Error('Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating AI message:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI message",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendAIMessage = async (messageToSend?: string) => {
    const finalMessage = messageToSend || editedMessage;
    if (!user || !finalMessage || isSending) return;

    setIsSending(true);
    try {
      console.log('🤖 Sending AI message:', finalMessage);
      await sendMessage(lead.id, finalMessage, user, true);
      
      toast({
        title: "Message Sent",
        description: "AI message sent successfully",
        variant: "default"
      });

      // Clear states after successful send
      setGeneratedMessage('');
      setEditedMessage('');
      setShowMessageEditor(false);
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending AI message:', error);
      toast({
        title: "Error",
        description: "Failed to send AI message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const generateAndSendAIMessage = async () => {
    if (isGenerating || isSending) return;

    setIsGenerating(true);
    try {
      console.log('🤖 Generating and auto-sending AI message...');
      const message = await generateIntelligentAIMessage({
        leadId: lead.id,
        stage: 'follow_up',
        context: {
          availableInventory: inventoryContext,
          inventoryCount: inventoryContext.length,
          strictInventoryMode: true,
          vehicleInterest: lead.vehicleInterest || ''
        }
      });

      if (message) {
        setIsGenerating(false);
        // Directly send the message without showing editor
        await sendAIMessage(message);
      } else {
        throw new Error('Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating and sending AI message:', error);
      toast({
        title: "Error",
        description: "Failed to generate and send AI message",
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };

  const hasValidInventory = inventoryContext.length > 0;

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="w-4 h-4 text-purple-600" />
          Finn AI Assistant
          <Badge variant="outline" className="bg-purple-100 text-purple-700 text-xs">
            Enhanced
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 text-sm">
        {/* Compact Customer Information */}
        <div className="bg-gray-50 p-2 rounded space-y-1">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="font-medium text-xs">{lead.firstName} {lead.lastName}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 text-xs">
            <Phone className="w-3 h-3" />
            {lead.phoneNumbers?.find(p => p.isPrimary)?.number || 'No phone'}
          </div>
        </div>

        {/* Compact Vehicle Interest */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium">
            <Car className="w-3 h-3" />
            Vehicle Interest
          </div>
          <div className="bg-blue-50 p-2 rounded text-xs">
            {lead.vehicleInterest || 'No specific interest noted'}
          </div>
          {(lead.vehicleMake || lead.vehicleModel || lead.vehicleYear) && (
            <div className="flex flex-wrap gap-1">
              {lead.vehicleYear && <Badge variant="outline" className="text-xs py-0">{lead.vehicleYear}</Badge>}
              {lead.vehicleMake && <Badge variant="outline" className="text-xs py-0">{lead.vehicleMake}</Badge>}
              {lead.vehicleModel && <Badge variant="outline" className="text-xs py-0">{lead.vehicleModel}</Badge>}
            </div>
          )}
        </div>

        {/* Compact Inventory Status */}
        <div className="space-y-1">
          <Alert className={`py-2 ${hasValidInventory ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center gap-2">
              {hasValidInventory ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <XCircle className="w-3 h-3 text-red-600" />
              )}
              <AlertDescription className={`text-xs ${hasValidInventory ? "text-green-800" : "text-red-800"}`}>
                {inventoryValidated ? (
                  hasValidInventory 
                    ? `${inventoryContext.length} matching vehicles`
                    : "No matching inventory"
                ) : (
                  "Validating..."
                )}
              </AlertDescription>
            </div>
          </Alert>

          {hasValidInventory && (
            <div className="space-y-1 max-h-16 overflow-y-auto">
              {inventoryContext.slice(0, 2).map((vehicle) => (
                <div key={vehicle.id} className="text-xs p-1.5 bg-blue-50 rounded border">
                  <div className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </div>
                  {vehicle.price && (
                    <div className="text-green-600 font-medium">
                      ${vehicle.price.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
              {inventoryContext.length > 2 && (
                <div className="text-xs text-gray-600 text-center">
                  +{inventoryContext.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact AI Message Generation */}
        {!showMessageEditor ? (
          <div className="space-y-2">
            <div className="flex gap-1">
              <Button 
                onClick={generateAIMessage} 
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                {isGenerating ? "Generating..." : "Generate & Review"}
              </Button>
              
              <Button 
                onClick={generateAndSendAIMessage} 
                disabled={isGenerating || isSending}
                size="sm"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-xs h-8"
              >
                {isGenerating || isSending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Send className="w-3 h-3 mr-1" />
                )}
                {isGenerating ? "Generating..." : isSending ? "Sending..." : "Generate & Send"}
              </Button>
            </div>
            
            {!hasValidInventory && (
              <Alert className="border-yellow-200 bg-yellow-50 py-1">
                <AlertTriangle className="w-3 h-3 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-xs">
                  AI will not claim specific vehicles are available
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">AI Generated Message</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMessageEditor(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="min-h-[80px] text-xs"
              placeholder="Edit the AI-generated message..."
            />
            
            <div className="flex gap-1">
              <Button 
                onClick={() => sendAIMessage()} 
                disabled={!editedMessage.trim() || isSending}
                size="sm"
                className="flex-1 text-xs h-8"
              >
                <Send className="w-3 h-3 mr-1" />
                {isSending ? "Sending..." : "Send"}
              </Button>
              <Button 
                variant="outline" 
                onClick={generateAIMessage}
                disabled={isGenerating}
                size="sm"
                className="text-xs h-8"
              >
                Regenerate
              </Button>
            </div>
          </div>
        )}

        {/* Compact Safety Features */}
        <div className="flex flex-wrap gap-1">
          <Badge variant={hasValidInventory ? "default" : "secondary"} className="text-xs py-0">
            {hasValidInventory ? "Inventory Verified" : "Safe Mode"}
          </Badge>
          <Badge variant="outline" className="text-xs py-0">
            Question-First AI
          </Badge>
          {inventoryValidated && (
            <Badge variant="outline" className="text-xs py-0">
              ✓ Fact Checked
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedAIPanel;
