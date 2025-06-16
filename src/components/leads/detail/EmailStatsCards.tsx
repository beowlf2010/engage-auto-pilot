
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MailOpen, Send, Reply, TrendingUp } from 'lucide-react';
import { EmailConversation } from '@/types/email';

interface EmailStatsCardsProps {
  emails: EmailConversation[];
}

const EmailStatsCards: React.FC<EmailStatsCardsProps> = ({ emails }) => {
  const sentEmails = emails.filter(e => e.direction === 'out');
  const receivedEmails = emails.filter(e => e.direction === 'in');
  const openedEmails = emails.filter(e => e.opened_at);
  const openRate = sentEmails.length > 0 ? (openedEmails.length / sentEmails.length) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
          <Send className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{sentEmails.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Emails Received</CardTitle>
          <Reply className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{receivedEmails.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Opened</CardTitle>
          <MailOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openedEmails.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openRate.toFixed(1)}%</div>
          <Badge variant={openRate > 25 ? "default" : "secondary"} className="text-xs">
            {openRate > 25 ? "Good" : "Needs Improvement"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailStatsCards;
