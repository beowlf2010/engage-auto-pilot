
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEmailConversations } from '@/hooks/useEmailConversations';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen, MailX, Clock, CheckCircle, Bot, User } from 'lucide-react';
import { EmailConversation } from '@/types/email';

interface EmailConversationsListProps {
  leadId: string;
}

const EmailConversationsList = ({ leadId }: EmailConversationsListProps) => {
  const { data: emails = [], isLoading } = useEmailConversations(leadId);

  const getStatusIcon = (status: EmailConversation['email_status']) => {
    switch (status) {
      case 'sent':
        return <Mail className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'opened':
        return <MailOpen className="w-4 h-4" />;
      case 'failed':
      case 'bounced':
        return <MailX className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: EmailConversation['email_status']) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'opened':
        return 'bg-purple-100 text-purple-800';
      case 'failed':
      case 'bounced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionIcon = (direction: 'in' | 'out') => {
    return direction === 'in' ? (
      <User className="w-4 h-4 text-blue-600" />
    ) : (
      <Bot className="w-4 h-4 text-green-600" />
    );
  };

  const getDirectionLabel = (direction: 'in' | 'out', subject: string) => {
    if (direction === 'in') return 'Received';
    return subject.startsWith('Re:') ? 'Auto-reply' : 'Sent';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No emails sent to this lead yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <Card key={email.id} className={`hover:shadow-md transition-shadow ${
          email.direction === 'in' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getDirectionIcon(email.direction)}
                <CardTitle className="text-sm font-medium">{email.subject}</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {getDirectionLabel(email.direction, email.subject)}
                </Badge>
                <Badge className={getStatusColor(email.email_status)}>
                  {getStatusIcon(email.email_status)}
                  <span className="ml-1 capitalize">{email.email_status}</span>
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatDistanceToNow(new Date(email.sent_at), { addSuffix: true })}</span>
              {email.opened_at && (
                <span className="text-purple-600">
                  Opened {formatDistanceToNow(new Date(email.opened_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div 
              className="text-sm text-gray-700 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
            {email.email_error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                Error: {email.email_error}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EmailConversationsList;
