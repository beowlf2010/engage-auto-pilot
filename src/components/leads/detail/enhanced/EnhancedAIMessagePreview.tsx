import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Send, X, AlertTriangle, CheckCircle } from "lucide-react";
import { getInventoryForAIMessaging } from "@/services/inventory/inventoryQueries";
import { unifiedAIResponseEngine, MessageContext } from "@/services/unifiedAIResponseEngine";
import { sendMessage } from "@/services/messagesService";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "@/hooks/use-toast";

interface EnhancedAIMessagePreviewProps {
  leadId: string;
  leadName: string;
  vehicleInterest?: string;
  onMessageSent?: () => void;
  onClose?: () => void;
}

const EnhancedAIMessagePreview: React.FC<EnhancedAIMessagePreviewProps> = ({
  leadId,
  leadName,
  vehicleInterest,
  onMessageSent,
  onClose
}) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [inventoryContext, setInventoryContext] = useState<any[]>([]);
  const [inventoryValidated, setInventoryValidated] = useState(false);

  useEffect(() => {
    generateMessageWithValidation();
  }, [leadId]);

  const generateMessageWithValidation = async () => {
    setIsGenerating(true);
    setInventoryValidated(false);
    
    try {
      // First, validate inventory
      const matchingInventory = await getInventoryForAIMessaging(leadId);
      const validInventory = matchingInventory.filter(v => v.model && v.model !== 'Unknown');
      
      setInventoryContext(validInventory);
      setInventoryValidated(true);

      // Generate message using unified AI
      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage: '',
        conversationHistory: [],
        vehicleInterest: vehicleInterest || ''
      };

      const response = unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        setGeneratedMessage(response.message);
      } else {
        throw new Error('Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating validated AI message:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI message with inventory validation",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendNow = async () => {
    if (!user || !generatedMessage || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(leadId, generatedMessage, user, true);
      
      toast({
        title: "Message Sent",
        description: "AI message sent successfully with inventory validation",
        variant: "default"
      });

      onMessageSent?.();
      onClose?.();
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

  const hasValidInventory = inventoryContext.length > 0;

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <span>AI Message Preview</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inventory Validation Status */}
        <Alert className={hasValidInventory ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <div className="flex items-center gap-2">
            {hasValidInventory ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={hasValidInventory ? "text-green-800" : "text-red-800"}>
              {inventoryValidated ? (
                hasValidInventory 
                  ? `✓ ${inventoryContext.length} matching vehicles verified`
                  : "⚠️ No matching inventory - Safe messaging mode enabled"
              ) : (
                "Validating inventory..."
              )}
            </AlertDescription>
          </div>
        </Alert>

        {/* Available Inventory Preview */}
        {hasValidInventory && (
          <div className="space-y-2">
            <div className="font-medium text-sm">Vehicles AI Can Reference:</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {inventoryContext.slice(0, 3).map((vehicle) => (
                <div key={vehicle.id} className="text-xs p-2 bg-blue-50 rounded">
                  {vehicle.year} {vehicle.make} {vehicle.model} 
                  {vehicle.price && ` - $${vehicle.price.toLocaleString()}`}
                </div>
              ))}
              {inventoryContext.length > 3 && (
                <div className="text-xs text-gray-600">
                  +{inventoryContext.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generated Message */}
        <div className="space-y-2">
          <div className="font-medium text-sm">Generated Message:</div>
          {isGenerating ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded border text-sm">
              {generatedMessage || "Failed to generate message"}
            </div>
          )}
        </div>

        {/* Safety Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={hasValidInventory ? "default" : "secondary"}>
            {hasValidInventory ? "Inventory Verified" : "Safe Mode"}
          </Badge>
          {inventoryValidated && (
            <Badge variant="outline" className="text-xs">
              ✓ Fact Checked
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={sendNow} 
            disabled={!generatedMessage || isSending || isGenerating}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Sending..." : "Send Message"}
          </Button>
          <Button 
            variant="outline" 
            onClick={generateMessageWithValidation}
            disabled={isGenerating}
          >
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAIMessagePreview;
