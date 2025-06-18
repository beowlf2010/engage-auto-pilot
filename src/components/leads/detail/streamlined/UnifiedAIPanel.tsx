
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-purple-600" />
          Finn AI Assistant
          <Badge variant="outline" className="bg-purple-100 text-purple-700">
            Enhanced
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="w-4 h-4" />
            Customer Details
          </div>
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <div><strong>{lead.firstName} {lead.lastName}</strong></div>
            <div className="flex items-center gap-1 text-gray-600">
              <Phone className="w-3 h-3" />
              {lead.phoneNumbers?.find(p => p.isPrimary)?.number || 'No phone'}
            </div>
          </div>
        </div>

        {/* Vehicle Interest */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Car className="w-4 h-4" />
            Vehicle Interest
          </div>
          <div className="bg-blue-50 p-3 rounded text-sm">
            {lead.vehicleInterest || 'No specific interest noted'}
          </div>
          {(lead.vehicleMake || lead.vehicleModel || lead.vehicleYear) && (
            <div className="flex flex-wrap gap-1">
              {lead.vehicleYear && <Badge variant="outline">{lead.vehicleYear}</Badge>}
              {lead.vehicleMake && <Badge variant="outline">{lead.vehicleMake}</Badge>}
              {lead.vehicleModel && <Badge variant="outline">{lead.vehicleModel}</Badge>}
            </div>
          )}
        </div>

        {/* Inventory Status */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Inventory Status</div>
          <Alert className={hasValidInventory ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center gap-2">
              {hasValidInventory ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription className={hasValidInventory ? "text-green-800" : "text-red-800"}>
                {inventoryValidated ? (
                  hasValidInventory 
                    ? `${inventoryContext.length} matching vehicles available`
                    : "No matching inventory - Safe messaging mode"
                ) : (
                  "Validating inventory..."
                )}
              </AlertDescription>
            </div>
          </Alert>

          {hasValidInventory && (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {inventoryContext.slice(0, 3).map((vehicle) => (
                <div key={vehicle.id} className="text-xs p-2 bg-blue-50 rounded border">
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
              {inventoryContext.length > 3 && (
                <div className="text-xs text-gray-600 text-center">
                  +{inventoryContext.length - 3} more vehicles
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Message Generation */}
        {!showMessageEditor ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button 
                onClick={generateAIMessage} 
                disabled={isGenerating}
                variant="outline"
                className="flex-1"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? "Generating..." : "Generate & Review"}
              </Button>
              
              <Button 
                onClick={generateAndSendAIMessage} 
                disabled={isGenerating || isSending}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating || isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? "Generating..." : isSending ? "Sending..." : "Generate & Send"}
              </Button>
            </div>
            
            {!hasValidInventory && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-xs">
                  AI will not claim specific vehicles are available
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">AI Generated Message</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMessageEditor(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="min-h-[100px]"
              placeholder="Edit the AI-generated message..."
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={() => sendAIMessage()} 
                disabled={!editedMessage.trim() || isSending}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? "Sending..." : "Send Message"}
              </Button>
              <Button 
                variant="outline" 
                onClick={generateAIMessage}
                disabled={isGenerating}
              >
                Regenerate
              </Button>
            </div>
          </div>
        )}

        {/* Safety Features */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={hasValidInventory ? "default" : "secondary"} className="text-xs">
            {hasValidInventory ? "Inventory Verified" : "Safe Mode"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Question-First AI
          </Badge>
          {inventoryValidated && (
            <Badge variant="outline" className="text-xs">
              ✓ Fact Checked
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedAIPanel;
