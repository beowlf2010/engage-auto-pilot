
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye } from 'lucide-react';
import { MessageQuality } from '../types/messagePreviewTypes';

interface MessagePreviewHeaderProps {
  isInitialContact: boolean;
  quality: MessageQuality;
  onPreviewFull: () => void;
}

const MessagePreviewHeader = ({ isInitialContact, quality, onPreviewFull }: MessagePreviewHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-sm">
          {isInitialContact ? 'Finn Introduction Preview (Jason Pilger Chevrolet)' : 'AI Follow-up Preview'}
        </span>
        <Badge variant="outline" className="text-xs">
          Quality: <span className={quality.color}>{quality.score}/11</span>
        </Badge>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreviewFull}
        className="h-6 px-2"
      >
        <Eye className="w-3 h-3 mr-1" />
        Full View
      </Button>
    </div>
  );
};

export default MessagePreviewHeader;
