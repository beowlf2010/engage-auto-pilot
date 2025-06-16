
import React from 'react';
import { User } from "lucide-react";

const MessageEmptyState: React.FC = () => {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>No messages yet</p>
      <p className="text-sm">Start a conversation to engage with this lead</p>
    </div>
  );
};

export default MessageEmptyState;
