
import { useCallback } from 'react';

interface UseChatHandlersProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  setIsSending: (sending: boolean) => void;
  setShowAIGenerator: (show: boolean) => void;
  setShowScrollButton: (show: boolean) => void;
  onSendMessage: (message: string, isTemplate?: boolean) => void;
  updateSummary: () => void;
  updateSuggestions: () => void;
  isSending: boolean;
}

export const useChatHandlers = ({
  newMessage,
  setNewMessage,
  setIsSending,
  setShowAIGenerator,
  setShowScrollButton,
  onSendMessage,
  updateSummary,
  updateSuggestions,
  isSending
}: UseChatHandlersProps) => {
  const handleScroll = useCallback(() => {
    setShowScrollButton(Math.random() > 0.7); // Placeholder logic
  }, [setShowScrollButton]);

  const handleScrollToBottom = useCallback(() => {
    setShowScrollButton(false);
  }, [setShowScrollButton]);

  const handleSend = useCallback(async () => {
    if (newMessage.trim() && !isSending) {
      setIsSending(true);
      try {
        console.log('📤 Sending message from chat view:', newMessage.trim());
        await onSendMessage(newMessage.trim());
        setNewMessage('');
        
        // Update analysis after sending
        setTimeout(() => {
          updateSummary();
          updateSuggestions();
        }, 1000);
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsSending(false);
      }
    }
  }, [newMessage, isSending, setIsSending, onSendMessage, setNewMessage, updateSummary, updateSuggestions]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleAIGeneratedMessage = useCallback(async (message: string) => {
    setIsSending(true);
    try {
      await onSendMessage(message, false);
      setShowAIGenerator(false);
      
      // Update analysis after AI message
      setTimeout(() => {
        updateSummary();
        updateSuggestions();
      }, 1000);
    } catch (error) {
      console.error('Error sending AI message:', error);
    } finally {
      setIsSending(false);
    }
  }, [setIsSending, onSendMessage, setShowAIGenerator, updateSummary, updateSuggestions]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setNewMessage(suggestion);
  }, [setNewMessage]);

  return {
    handleScroll,
    handleScrollToBottom,
    handleSend,
    handleKeyPress,
    handleAIGeneratedMessage,
    handleSelectSuggestion
  };
};
