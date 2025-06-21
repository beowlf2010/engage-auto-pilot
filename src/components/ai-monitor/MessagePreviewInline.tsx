
import React from 'react';
import MessagePreviewCard from './MessagePreviewCard';
import { MessagePreviewInlineProps } from './types/messagePreviewTypes';

const MessagePreviewInline = (props: MessagePreviewInlineProps) => {
  return <MessagePreviewCard {...props} />;
};

export default MessagePreviewInline;
