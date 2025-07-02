import React from 'react';
import { Lead } from '@/types/lead';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Phone, 
  Mail, 
  Eye, 
  MessageSquare, 
  Sparkles,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import AISequenceStatus from './AISequenceStatus';

interface MobileLeadsListProps {
  leads: Lead[];
  selectedLeads: string[];
  onLeadSelect: (leadId: string) => void;
  onQuickView: (lead: Lead) => void;
  getEngagementScore: (lead: Lead) => number;
  isFresh: (lead: Lead) => boolean;
  canEdit: boolean;
}

const MobileLeadCard: React.FC<{
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  onQuickView: () => void;
  engagementScore: number;
  isFresh: boolean;
}> = ({ lead, isSelected, onSelect, onQuickView, engagementScore, isFresh }) => {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'engaged': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'lost': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className={cn(
      "mb-3 transition-all duration-200 hover:shadow-md",
      isSelected && "ring-2 ring-primary",
      lead.is_hidden && "opacity-50"
    )}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-left hover:text-primary text-base"
                  onClick={() => {
                    window.open(`/smart-inbox?leadId=${lead.id}`, '_blank');
                  }}
                >
                  <span className="truncate">
                    {lead.firstName} {lead.lastName}
                  </span>
                </Button>
                
                {isFresh && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Fresh
                  </Badge>
                )}
                
                {lead.is_hidden && (
                  <Badge variant="outline" className="text-xs">
                    Hidden
                  </Badge>
                )}
              </div>
              
              <Badge className={cn("text-xs", getStatusColor(lead.status))}>
                {lead.status}
              </Badge>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onQuickView}
            className="p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Contact Info Row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{lead.primaryPhone}</span>
          </div>
          
          <div className="flex items-center space-x-2 min-w-0">
            <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{lead.email}</span>
          </div>
        </div>

        {/* Vehicle Interest */}
        {lead.vehicleInterest && (
          <div className="mb-3">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">
                {lead.vehicleInterest}
              </span>
            </div>
          </div>
        )}

        {/* Engagement & Messages Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={cn("w-2 h-2 rounded-full", getEngagementColor(engagementScore))} />
            <span className="text-xs text-muted-foreground">
              {engagementScore}% engaged
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-blue-600">↗{lead.outgoingCount}</span>
              <span className="text-green-600">↙{lead.incomingCount}</span>
            </div>
            
            {lead.unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                {lead.unreadCount}
              </Badge>
            )}
          </div>
        </div>

        {/* AI Status */}
        <div className="flex items-center justify-between">
          <AISequenceStatus 
            aiOptIn={lead.aiOptIn || false}
            aiStage={lead.aiStage}
            nextAiSendAt={lead.nextAiSendAt}
            aiSequencePaused={lead.aiSequencePaused}
            aiPauseReason={lead.aiPauseReason}
            aiMessagesSent={lead.aiMessagesSent}
            
          />
          
          {lead.lastMessageTime && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lead.lastMessageTime), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 mt-3 pt-3 border-t">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <a href={`tel:${lead.primaryPhone}`}>
              <Phone className="w-4 h-4 mr-1" />
              Call
            </a>
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              window.open(`/smart-inbox?leadId=${lead.id}`, '_blank');
            }}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Message
          </Button>
          
          <Button size="sm" variant="outline" onClick={onQuickView}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileLeadsList: React.FC<MobileLeadsListProps> = ({
  leads,
  selectedLeads,
  onLeadSelect,
  onQuickView,
  getEngagementScore,
  isFresh,
  canEdit
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null; // Fallback to desktop table
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No leads found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or upload new leads to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {leads.map((lead) => (
        <MobileLeadCard
          key={lead.id}
          lead={lead}
          isSelected={selectedLeads.includes(lead.id.toString())}
          onSelect={() => onLeadSelect(lead.id.toString())}
          onQuickView={() => onQuickView(lead)}
          engagementScore={getEngagementScore(lead)}
          isFresh={isFresh(lead)}
        />
      ))}
    </div>
  );
};

export default MobileLeadsList;