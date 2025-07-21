import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import SmartInboxRobustWithErrorBoundary from './SmartInboxRobust';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import type { ConversationListItem } from '@/types/conversation';

interface SmartInboxProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInbox: React.FC<SmartInboxProps> = ({ onBack, leadId }) => {
  const { handleError } = useErrorHandler();

  try {
    // Use the robust version with enhanced error handling
    return (
      <SmartInboxRobustWithErrorBoundary 
        onBack={onBack} 
        leadId={leadId} 
      />
    );
  } catch (error) {
    console.error('❌ [SMART INBOX] Critical error in main component:', error);
    
    handleError(error, 'Smart Inbox initialization', {
      showToast: true,
      logError: true,
      fallbackMessage: 'Failed to initialize Smart Inbox. Please refresh the page.'
    });

    // Fallback UI
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700 mb-2">
            Smart Inbox Unavailable
          </div>
          <div className="text-sm text-gray-500 mb-4">
            There was an error loading the inbox. Please refresh the page.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export default SmartInbox;
