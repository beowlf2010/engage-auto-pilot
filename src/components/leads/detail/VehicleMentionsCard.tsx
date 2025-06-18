
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Calendar, MessageSquare, Search, CheckCircle, XCircle } from "lucide-react";
import { getLeadVehicleMentions, getLeadAIConversationNotes, VehicleMention, AIConversationNote } from '@/services/vehicleMention';

interface VehicleMentionsCardProps {
  leadId: string;
}

const VehicleMentionsCard: React.FC<VehicleMentionsCardProps> = ({ leadId }) => {
  const [vehicleMentions, setVehicleMentions] = useState<VehicleMention[]>([]);
  const [aiNotes, setAiNotes] = useState<AIConversationNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [mentions, notes] = await Promise.all([
          getLeadVehicleMentions(leadId),
          getLeadAIConversationNotes(leadId)
        ]);
        setVehicleMentions(mentions);
        setAiNotes(notes);
      } catch (error) {
        console.error('Error loading vehicle mentions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      loadData();
    }
  }, [leadId]);

  const getContextIcon = (contextType: string) => {
    switch (contextType) {
      case 'inquiry':
        return <Search className="w-3 h-3" />;
      case 'showed_inventory':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'suggested_alternative':
        return <Car className="w-3 h-3 text-blue-600" />;
      case 'no_inventory':
        return <XCircle className="w-3 h-3 text-red-600" />;
      default:
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  const getContextColor = (contextType: string) => {
    switch (contextType) {
      case 'inquiry':
        return 'bg-blue-100 text-blue-800';
      case 'showed_inventory':
        return 'bg-green-100 text-green-800';
      case 'suggested_alternative':
        return 'bg-yellow-100 text-yellow-800';
      case 'no_inventory':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Car className="w-4 h-4" />
            <span>Vehicle Interest History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Car className="w-4 h-4" />
          <span>Vehicle Interest History</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vehicleMentions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No vehicle mentions yet</div>
        ) : (
          <>
            {/* Recent Vehicle Mentions */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent Mentions
              </div>
              {vehicleMentions.slice(0, 5).map((mention) => (
                <div
                  key={mention.id}
                  className="flex items-start justify-between p-2 border rounded-lg text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={`${getContextColor(mention.context_type)} text-xs px-1.5 py-0.5`}>
                        <span className="flex items-center space-x-1">
                          {getContextIcon(mention.context_type)}
                          <span className="capitalize">{mention.context_type.replace('_', ' ')}</span>
                        </span>
                      </Badge>
                      {mention.inventory_available && (
                        <Badge className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                          In Stock
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium text-gray-900 truncate">
                      {mention.mentioned_vehicle}
                    </div>
                    {mention.ai_response_notes && (
                      <div className="text-muted-foreground mt-1 line-clamp-2">
                        {mention.ai_response_notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-muted-foreground ml-2">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>{new Date(mention.mentioned_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Conversation Notes */}
            {aiNotes.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  AI Discussion Notes
                </div>
                {aiNotes.slice(0, 3).map((note) => (
                  <div
                    key={note.id}
                    className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge className="bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 capitalize">
                        {note.note_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-gray-700 line-clamp-2">
                      {note.note_content}
                    </div>
                    {note.vehicles_discussed.length > 0 && (
                      <div className="text-muted-foreground mt-1">
                        Discussed: {note.vehicles_discussed.length} vehicle(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleMentionsCard;
