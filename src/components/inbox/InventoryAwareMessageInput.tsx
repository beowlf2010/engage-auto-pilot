
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Car, Send, Loader2 } from 'lucide-react';
import { findMatchingInventory } from '@/services/inventory/inventoryMatching';
import { processConversationForAI } from '@/services/conversationAnalysis';

interface InventoryAwareMessageInputProps {
  leadId: string | null;
  conversationHistory: string;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const InventoryAwareMessageInput: React.FC<InventoryAwareMessageInputProps> = ({
  leadId,
  conversationHistory,
  onSendMessage,
  disabled = false,
  placeholder = "Type your message..."
}) => {
  const [message, setMessage] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [inventoryInsights, setInventoryInsights] = useState<any>(null);

  const analyzeAndSuggest = useCallback(async () => {
    if (!leadId || !message.trim()) return;

    setAnalyzing(true);
    try {
      // Analyze the message for vehicle interest
      const analysis = processConversationForAI(conversationHistory, message, leadId);
      
      // Check inventory if vehicle interest detected
      if (analysis.vehicleInterest.primaryVehicle !== 'unknown') {
        const inventory = await findMatchingInventory(leadId);
        
        setInventoryInsights({
          vehicleInterest: analysis.vehicleInterest,
          availableVehicles: inventory,
          suggestions: analysis.nextBestActions
        });
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
    } finally {
      setAnalyzing(false);
    }
  }, [leadId, message, conversationHistory]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setInventoryInsights(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const enhanceMessageWithInventory = (baseMessage: string) => {
    if (!inventoryInsights?.availableVehicles?.length) return baseMessage;

    const { vehicleInterest, availableVehicles } = inventoryInsights;
    const matchingVehicles = availableVehicles.filter((vehicle: any) =>
      vehicle.make?.toLowerCase().includes(vehicleInterest.primaryVehicle.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(vehicleInterest.primaryVehicle.toLowerCase())
    );

    if (matchingVehicles.length > 0) {
      const vehicle = matchingVehicles[0];
      return `${baseMessage}\n\nGreat news! I found a ${vehicle.year} ${vehicle.make} ${vehicle.model} in our inventory (Stock #${vehicle.stock_number}). Would you like me to share more details?`;
    }

    return baseMessage;
  };

  return (
    <div className="space-y-3">
      {/* Inventory Insights Panel */}
      {inventoryInsights && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Car className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-blue-800">Vehicle Interest Detected</span>
                <Badge variant="secondary" className="text-xs">
                  {inventoryInsights.vehicleInterest.primaryVehicle}
                </Badge>
              </div>
              
              {inventoryInsights.availableVehicles.length > 0 ? (
                <div className="text-sm text-blue-700">
                  Found {inventoryInsights.availableVehicles.length} matching vehicles in inventory
                </div>
              ) : (
                <div className="text-sm text-orange-700">
                  No exact matches found in current inventory
                </div>
              )}

              {inventoryInsights.suggestions.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-blue-600 mb-1">Suggested actions:</div>
                  <div className="flex flex-wrap gap-1">
                    {inventoryInsights.suggestions.slice(0, 2).map((suggestion: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Message Input */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[80px] pr-12"
          />
          
          {/* AI Analysis Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={analyzeAndSuggest}
            disabled={!message.trim() || analyzing || !leadId}
            className="absolute top-2 right-2 h-8 w-8 p-0"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </Button>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="h-auto px-6"
        >
          <Send className="w-4 h-4 mr-2" />
          Send
        </Button>
      </div>

      {/* Enhanced Message Preview */}
      {inventoryInsights && message.trim() && (
        <Card className="p-3 bg-gray-50 border-gray-200">
          <div className="text-xs text-gray-600 mb-2">Enhanced message preview:</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {enhanceMessageWithInventory(message)}
          </div>
        </Card>
      )}
    </div>
  );
};

export default InventoryAwareMessageInput;
