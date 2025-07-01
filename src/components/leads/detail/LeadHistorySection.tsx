
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, MessageSquare, Phone, Mail, Calendar } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface HistoryItem {
  id: string;
  type: 'message' | 'status_change' | 'note_added' | 'call' | 'email' | 'appointment';
  description: string;
  timestamp: string;
  details?: any;
}

interface LeadHistorySectionProps {
  leadId: string;
}

const LeadHistorySection: React.FC<LeadHistorySectionProps> = ({ leadId }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [leadId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      // Load conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false });

      // Load notes
      const { data: notes } = await supabase
        .from('lead_notes')
        .select('*, profiles(first_name, last_name)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      // Combine and sort all history items
      const historyItems: HistoryItem[] = [];

      // Add conversations
      conversations?.forEach(conv => {
        historyItems.push({
          id: conv.id,
          type: 'message',
          description: `${conv.direction === 'in' ? 'Received' : 'Sent'} message: "${conv.body.substring(0, 50)}${conv.body.length > 50 ? '...' : ''}"`,
          timestamp: conv.sent_at,
          details: conv
        });
      });

      // Add notes
      notes?.forEach(note => {
        historyItems.push({
          id: note.id,
          type: 'note_added',
          description: `Note added: "${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}"`,
          timestamp: note.created_at,
          details: note
        });
      });

      // Sort by timestamp (most recent first)
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setHistory(historyItems);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'status_change':
        return <User className="h-4 w-4" />;
      case 'note_added':
        return <MessageSquare className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'message':
        return 'default';
      case 'status_change':
        return 'secondary';
      case 'note_added':
        return 'outline';
      case 'call':
        return 'destructive';
      case 'email':
        return 'secondary';
      case 'appointment':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={item.id} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getBadgeVariant(item.type)} className="text-xs">
                        {item.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LeadHistorySection;
