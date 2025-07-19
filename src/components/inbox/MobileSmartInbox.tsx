
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useConversationInitialization } from '@/hooks/inbox/useConversationInitialization';
import { useCentralizedRealtime } from '@/hooks/useCentralizedRealtime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Search, Filter, ArrowLeft, Phone, Clock, User, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ConversationListItem } from '@/types/conversation';
import { LoadingSpinner } from '@/components/inbox/LoadingStates';
import InboxConversationsList from '@/components/inbox/InboxConversationsList';

interface MobileSmartInboxProps {
  onLeadsRefresh: () => void;
  preselectedLeadId?: string | null;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({
  onLeadsRefresh,
  preselectedLeadId
}) => {
  console.log('🚀 [MOBILE INBOX] Component is rendering!');
  const { profile, loading: authLoading } = useAuth();
  console.log('🔍 [MOBILE INBOX] Auth state:', { authLoading, hasProfile: !!profile });
  const [activeTab, setActiveTab] = useState("unread");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'context'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Get conversations data
  const { conversations, conversationsLoading, refetchConversations, error } = useConversationsList();

  console.log('🔍 [MOBILE INBOX DEBUG] Component state:', {
    authLoading,
    profile: profile ? { id: profile.id, email: profile.email } : null,
    conversationsLoading,
    conversationsCount: conversations.length,
    selectedLead,
    mobileView
  });

  // Centralized realtime subscriptions
  useCentralizedRealtime({
    enabled: !!profile?.id,
    onConversationUpdate: refetchConversations,
    onMessageUpdate: refetchConversations,
    currentLeadId: selectedLead
  });

  // Filter conversations based on active tab and search
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.leadPhone.includes(searchQuery) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === "all" || 
      (activeTab === "unread" && conv.unreadCount > 0) ||
      (activeTab === "incoming" && conv.lastMessageDirection === 'in');

    return matchesSearch && matchesTab;
  });

  // Handle conversation selection
  const handleSelectConversation = async (leadId: string) => {
    console.log('📱 [MOBILE INBOX] Selecting conversation:', leadId);
    setSelectedLead(leadId);
    setMobileView('chat');
  };

  // Initialization hook
  useConversationInitialization({
    loading: conversationsLoading,
    isInitialized,
    filteredConversations,
    selectedLead,
    leadIdFromUrl: preselectedLeadId,
    onSelectConversation: handleSelectConversation,
    setIsInitialized
  });

  // Calculate stats
  const unreadCount = conversations.filter(conv => conv.unreadCount > 0).length;
  const incomingCount = conversations.filter(conv => conv.lastMessageDirection === 'in').length;

  // Loading state
  if (conversationsLoading) {
    console.log('🔍 [MOBILE INBOX DEBUG] Conversations loading...');
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center" style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <div className="text-center p-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Loading Smart Inbox...</p>
          <p className="text-sm text-gray-600 mt-1">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center" style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Conversations</h3>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          <Button onClick={refetchConversations} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Debug info - this should help us see what's happening
  console.log('🔍 [MOBILE INBOX DEBUG] Rendering with data:', {
    conversationsCount: conversations.length,
    unreadCount,
    incomingCount,
    currentView: mobileView
  });

  // Emergency fallback UI with explicit styling
  const EmergencyFallback = () => (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%', 
      backgroundColor: '#ffffff', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '16px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '2px solid #3b82f6'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          Smart Inbox - Emergency Mode
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Conversations: {conversations.length} | Unread: {unreadCount} | Incoming: {incomingCount}
        </p>
      </div>
      
      <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
        <p style={{ color: '#92400e', fontSize: '12px' }}>
          DEBUG: Main UI failed to render, showing emergency fallback
        </p>
      </div>

      {conversations.slice(0, 5).map(conv => (
        <div key={conv.leadId} style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '8px'
        }}>
          <h3 style={{ fontWeight: '600', color: '#111827' }}>{conv.leadName}</h3>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>{conv.leadPhone}</p>
          <p style={{ fontSize: '14px', color: '#374151', marginTop: '4px' }}>
            {conv.lastMessage.substring(0, 100)}...
          </p>
          {conv.unreadCount > 0 && (
            <span style={{
              backgroundColor: '#dc2626',
              color: 'white',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '10px'
            }}>
              {conv.unreadCount} unread
            </span>
          )}
        </div>
      ))}
    </div>
  );

  // Main render - with debug styling
  return (
    <div 
      className="h-screen w-full flex flex-col"
      style={{ 
        minHeight: '100vh', 
        backgroundColor: '#ffffff',
        border: '3px solid #10b981', // Green debug border
        boxSizing: 'border-box'
      }}
    >
      {/* Debug header */}
      <div style={{ 
        backgroundColor: '#dcfce7', 
        padding: '8px', 
        fontSize: '12px', 
        color: '#166534',
        borderBottom: '1px solid #bbf7d0'
      }}>
        DEBUG: Conversations: {conversations.length} | View: {mobileView} | Selected: {selectedLead || 'none'}
      </div>

      {/* Header */}
      <div 
        className="flex-shrink-0 bg-white border-b border-gray-200 p-4"
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Smart Inbox</h1>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {conversations.length} conversations
            </Badge>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="incoming">Incoming ({incomingCount})</TabsTrigger>
            <TabsTrigger value="all">All ({conversations.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main content area */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ 
          backgroundColor: '#f9fafb',
          border: '2px solid #ef4444', // Red debug border
          minHeight: '400px'
        }}
      >
        {mobileView === 'list' ? (
          <div 
            className="h-full"
            style={{ 
              backgroundColor: '#ffffff',
              border: '2px solid #8b5cf6', // Purple debug border
              height: '100%',
              overflow: 'auto'
            }}
          >
            <InboxConversationsList
              conversations={filteredConversations}
              selectedConversationId={selectedLead}
              onConversationSelect={handleSelectConversation}
              loading={conversationsLoading}
              searchQuery={searchQuery}
              onMarkAsRead={async (leadId: string) => {
                console.log('Marking as read:', leadId);
                // TODO: Implement mark as read functionality
              }}
              isMarkingAsRead={false}
            />
          </div>
        ) : (
          <div 
            className="h-full flex flex-col"
            style={{ 
              backgroundColor: '#ffffff',
              border: '2px solid #f59e0b', // Yellow debug border
              height: '100%'
            }}
          >
            {/* Chat header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileView('list')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900">
                    {selectedLead ? 
                      conversations.find(c => c.leadId === selectedLead)?.leadName : 
                      'Select a conversation'
                    }
                  </h2>
                </div>
              </div>
            </div>

            {/* Chat content placeholder */}
            <div 
              className="flex-1 flex items-center justify-center"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Chat view coming soon</p>
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {selectedLead || 'None'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emergency fallback trigger */}
      {conversations.length === 0 && !conversationsLoading && (
        <EmergencyFallback />
      )}
    </div>
  );
};

export default MobileSmartInbox;
