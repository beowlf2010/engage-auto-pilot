
import { useState } from 'react';

export const useChatState = () => {
  const [newMessage, setNewMessage] = useState('');
  const [showLeadContext, setShowLeadContext] = useState(true);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  return {
    newMessage,
    setNewMessage,
    showLeadContext,
    setShowLeadContext,
    showAIGenerator,
    setShowAIGenerator,
    showAnalysis,
    setShowAnalysis,
    showAIPanel,
    setShowAIPanel,
    isSending,
    setIsSending,
    showScrollButton,
    setShowScrollButton
  };
};
