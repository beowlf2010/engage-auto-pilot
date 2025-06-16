
import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Bot } from "lucide-react";

interface MessageStatusIconProps {
  status?: string;
  aiGenerated: boolean;
}

const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({ status, aiGenerated }) => {
  const iconClass = "w-3 h-3";
  
  if (aiGenerated) {
    return <Bot className={`${iconClass} text-blue-500`} />;
  }
  
  switch (status) {
    case 'delivered':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    case 'pending':
      return <Clock className={`${iconClass} text-yellow-500`} />;
    case 'failed':
      return <AlertTriangle className={`${iconClass} text-red-500`} />;
    default:
      return <CheckCircle className={`${iconClass} text-gray-400`} />;
  }
};

export default MessageStatusIcon;
