
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Bug, RefreshCw } from 'lucide-react';
import { useUnifiedUnreadCount } from '@/hooks/useUnifiedUnreadCount';
import { useAuth } from '@/components/auth/AuthProvider';

interface InboxDebugPanelProps {
  conversations: any[];
  filteredConversations: any[];
  onRefresh: () => void;
}

const InboxDebugPanel = ({ conversations, filteredConversations, onRefresh }: InboxDebugPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { profile } = useAuth();
  const { unreadCount, debugInfo, refreshUnreadCount } = useUnifiedUnreadCount();

  const conversationStats = {
    total: conversations.length,
    filtered: filteredConversations.length,
    withUnread: conversations.filter(c => c.unreadCount > 0).length,
    totalUnreadMessages: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    assigned: conversations.filter(c => c.salespersonId).length,
    unassigned: conversations.filter(c => !c.salespersonId).length
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-white shadow-lg border-2 border-blue-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center">
              <Bug className="h-4 w-4 mr-2" />
              Inbox Debug Panel
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  onRefresh();
                  refreshUnreadCount();
                }}
                variant="ghost"
                size="sm"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setIsExpanded(false)}
                variant="ghost"
                size="sm"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          {/* Conversation Stats */}
          <div>
            <h4 className="font-medium mb-2">Conversation Stats</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Total: {conversationStats.total}</div>
              <div>Filtered: {conversationStats.filtered}</div>
              <div>With Unread: {conversationStats.withUnread}</div>
              <div>Total Unread Msgs: {conversationStats.totalUnreadMessages}</div>
              <div>Assigned: {conversationStats.assigned}</div>
              <div>Unassigned: {conversationStats.unassigned}</div>
            </div>
          </div>

          {/* Global Unread Count */}
          <div>
            <h4 className="font-medium mb-2">Global Unread Count</h4>
            <div className="text-lg font-bold text-red-600">{unreadCount}</div>
          </div>

          {/* User Info */}
          <div>
            <h4 className="font-medium mb-2">User Info</h4>
            <div>ID: {profile?.id?.slice(0, 8)}...</div>
            <div>Email: {profile?.email}</div>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div>
              <h4 className="font-medium mb-2">Debug Info</h4>
              <div className="bg-gray-100 p-2 rounded text-xs">
                <div>Total DB Unread: {debugInfo.totalUnreadMessages}</div>
                <div>User Unread: {debugInfo.userUnreadMessages}</div>
                <div>User Leads: {debugInfo.userAssignedLeads}</div>
                <div>Is Admin/Mgr: {debugInfo.isAdminOrManager ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}

          {/* Data Comparison */}
          <div className="bg-yellow-50 p-2 rounded">
            <h4 className="font-medium mb-1 text-yellow-800">Data Comparison</h4>
            <div className="text-yellow-700">
              <div>Global Count: {unreadCount}</div>
              <div>Conversation Count: {conversationStats.totalUnreadMessages}</div>
              <div className={`font-bold ${
                unreadCount === conversationStats.totalUnreadMessages 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                Match: {unreadCount === conversationStats.totalUnreadMessages ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InboxDebugPanel;
