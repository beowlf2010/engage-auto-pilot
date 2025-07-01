
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, RefreshCw, Database, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MessageDebugPanelProps {
  selectedLeadId: string | null;
  messages: any[];
  conversations: any[];
  onRefresh: () => void;
}

const MessageDebugPanel: React.FC<MessageDebugPanelProps> = ({
  selectedLeadId,
  messages,
  conversations,
  onRefresh
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [rawDbData, setRawDbData] = useState<any>(null);
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);

  const fetchRawData = async () => {
    if (!selectedLeadId) return;
    
    setIsLoadingRaw(true);
    try {
      console.log('🔍 [DEBUG PANEL] Fetching raw data for lead:', selectedLeadId);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', selectedLeadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ [DEBUG PANEL] Error fetching raw data:', error);
        return;
      }

      console.log('📊 [DEBUG PANEL] Raw database data:', data);
      setRawDbData(data);
    } catch (error) {
      console.error('❌ [DEBUG PANEL] Error in fetchRawData:', error);
    } finally {
      setIsLoadingRaw(false);
    }
  };

  const handleForceRefresh = () => {
    console.log('🔄 [DEBUG PANEL] Force refresh triggered');
    onRefresh();
    if (selectedLeadId) {
      fetchRawData();
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <Eye className="h-4 w-4 mr-2" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-auto">
      <Card className="bg-white shadow-xl border-2 border-blue-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Message Debug Panel</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleForceRefresh}
                variant="outline"
                size="sm"
                disabled={isLoadingRaw}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingRaw ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          {/* Current State */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Current State</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Selected Lead</Badge>
                <span className="text-gray-600">
                  {selectedLeadId ? selectedLeadId.substring(0, 8) + '...' : 'None'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Messages</Badge>
                <span className="text-gray-600">{messages.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Conversations</Badge>
                <span className="text-gray-600">{conversations.length}</span>
              </div>
            </div>
          </div>

          {/* Message Breakdown */}
          {selectedLeadId && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Message Breakdown</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Inbound:</span>
                  <Badge variant="outline" className="bg-blue-50">
                    {messages.filter(m => m.direction === 'in').length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Outbound:</span>
                  <Badge variant="outline" className="bg-green-50">
                    {messages.filter(m => m.direction === 'out').length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Unread:</span>
                  <Badge variant="outline" className="bg-red-50">
                    {messages.filter(m => m.direction === 'in' && !m.readAt).length}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Raw Database Data */}
          {selectedLeadId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Raw Database Data</h4>
                <Button
                  onClick={fetchRawData}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingRaw}
                >
                  <Database className={`h-3 w-3 mr-1 ${isLoadingRaw ? 'animate-spin' : ''}`} />
                  Fetch
                </Button>
              </div>
              
              {rawDbData && (
                <div className="bg-gray-50 p-2 rounded text-xs max-h-40 overflow-auto">
                  <div className="space-y-1">
                    {rawDbData.map((record: any, index: number) => (
                      <div key={record.id} className="border-b pb-1 mb-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={record.direction === 'in' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {record.direction.toUpperCase()}
                          </Badge>
                          <span className="text-gray-500">
                            {new Date(record.sent_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-700 mt-1">
                          {record.body.substring(0, 100)}
                          {record.body.length > 100 && '...'}
                        </div>
                        <div className="text-gray-500 mt-1">
                          Status: {record.sms_status || 'unknown'} | 
                          Read: {record.read_at ? 'Yes' : 'No'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Messages */}
          {messages.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Recent Messages (UI)</h4>
              <div className="bg-gray-50 p-2 rounded text-xs max-h-32 overflow-auto">
                {messages.slice(-5).map((msg, index) => (
                  <div key={msg.id} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className={`h-3 w-3 ${msg.direction === 'in' ? 'text-blue-500' : 'text-green-500'}`} />
                      <Badge variant="outline" className="text-xs">
                        {msg.direction.toUpperCase()}
                      </Badge>
                      <span className="text-gray-500">
                        {new Date(msg.sentAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-700 mt-1">
                      {msg.body.substring(0, 80)}
                      {msg.body.length > 80 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageDebugPanel;
