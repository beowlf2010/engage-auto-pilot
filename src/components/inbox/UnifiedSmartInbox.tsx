
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, MessageSquare, Bot, Users, Clock, Star } from 'lucide-react';
import { Lead } from '@/types/lead';
import { useRealtimeInbox } from '@/hooks/useRealtimeInbox';
import ConversationsList from './ConversationsList';
import EnhancedChatView from './EnhancedChatView';
import SmartFilters from './SmartFilters';
import MessageTemplates from './MessageTemplates';
import AIControlPanel from './AIControlPanel';

interface UnifiedSmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const UnifiedSmartInbox = ({ user }: UnifiedSmartInboxProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    status: [],
    aiOptIn: null,
    priority: null,
    assigned: null
  });

  const { conversations, messages, loading, fetchMessages, sendMessage, refetch } = useRealtimeInbox();

  // Filter conversations based on user role
  const filteredConversations = conversations.filter(conv => 
    user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId
  );

  // Apply search and filters
  const processedConversations = filteredConversations.filter(conv => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (!conv.leadName.toLowerCase().includes(searchLower) && 
          !conv.lastMessage.toLowerCase().includes(searchLower) &&
          !conv.vehicleInterest.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Tab filter
    if (activeTab === 'unread' && conv.unreadCount === 0) return false;
    if (activeTab === 'ai' && !conv.aiOptIn) return false;
    if (activeTab === 'priority' && conv.unreadCount === 0 && !conv.aiOptIn) return false;

    return true;
  });

  const selectedConversation = processedConversations.find(conv => conv.leadId === selectedLead);

  const handleSelectConversation = async (leadId: string) => {
    setSelectedLead(leadId);
    await fetchMessages(leadId);
  };

  const handleSendMessage = async (message: string, isTemplate: boolean = false) => {
    if (selectedLead) {
      await sendMessage(selectedLead, message);
      if (isTemplate) {
        setShowTemplates(false);
      }
    }
  };

  const getTabCounts = () => {
    const unreadCount = filteredConversations.filter(c => c.unreadCount > 0).length;
    const aiCount = filteredConversations.filter(c => c.aiOptIn).length;
    const priorityCount = filteredConversations.filter(c => c.unreadCount > 0 || c.aiOptIn).length;
    
    return { unreadCount, aiCount, priorityCount };
  };

  const { unreadCount, aiCount, priorityCount } = getTabCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                Smart Inbox
              </h1>
              <p className="text-slate-600 mt-1">Unified conversation management with AI assistance</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showTemplates ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search conversations, leads, or messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Smart Filters */}
        {showFilters && (
          <div className="mb-6">
            <SmartFilters
              filters={filters}
              onFiltersChange={setFilters}
              conversations={filteredConversations}
            />
          </div>
        )}

        {/* Conversation Tabs */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All ({filteredConversations.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Unread
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Active ({aiCount})
              </TabsTrigger>
              <TabsTrigger value="priority" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Priority ({priorityCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)]">
          {/* Conversations List */}
          <div className="col-span-4">
            <ConversationsList
              conversations={processedConversations}
              selectedLead={selectedLead}
              onSelectConversation={handleSelectConversation}
              canReply={(conv) => user.role === "manager" || user.role === "admin" || conv.salespersonId === user.id || !conv.salespersonId}
            />
          </div>

          {/* Chat View */}
          <div className="col-span-8">
            <EnhancedChatView
              selectedConversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              showTemplates={showTemplates}
              onToggleTemplates={() => setShowTemplates(!showTemplates)}
              user={user}
            />
          </div>
        </div>

        {/* Message Templates Panel */}
        {showTemplates && (
          <MessageTemplates
            onSelectTemplate={handleSendMessage}
            onClose={() => setShowTemplates(false)}
          />
        )}

        {/* AI Control Panel */}
        <AIControlPanel
          selectedLead={selectedLead}
          conversation={selectedConversation}
        />
      </div>
    </div>
  );
};

export default UnifiedSmartInbox;
