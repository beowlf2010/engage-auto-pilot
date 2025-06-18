
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageCircle, Shield, Zap } from 'lucide-react';

interface AIStatusBadgesProps {
  aiContactEnabled?: boolean;
  aiRepliesEnabled?: boolean;
  size?: 'sm' | 'default';
}

const AIStatusBadges = ({ 
  aiContactEnabled = false, 
  aiRepliesEnabled = false,
  size = 'sm'
}: AIStatusBadgesProps) => {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  // Both enabled - show combined badge
  if (aiContactEnabled && aiRepliesEnabled) {
    return (
      <Badge variant="default" className="bg-purple-100 text-purple-700 border-purple-200">
        <Zap className={`${iconSize} mr-1`} />
        Full AI
      </Badge>
    );
  }
  
  // Contact only
  if (aiContactEnabled && !aiRepliesEnabled) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <Bot className={`${iconSize} mr-1`} />
        AI Contact
      </Badge>
    );
  }
  
  // Replies only
  if (!aiContactEnabled && aiRepliesEnabled) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <MessageCircle className={`${iconSize} mr-1`} />
        AI Replies
      </Badge>
    );
  }
  
  // None enabled
  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
      <Shield className={`${iconSize} mr-1`} />
      Manual
    </Badge>
  );
};

export default AIStatusBadges;
