
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, TrendingUp, Heart } from "lucide-react";
import type { LeadDetailData } from "@/services/leadDetailService";

interface ConversationMetricsCardProps {
  lead: LeadDetailData;
}

const ConversationMetricsCard: React.FC<ConversationMetricsCardProps> = ({ lead }) => {
  const metrics = useMemo(() => {
    const conversations = lead.conversations || [];
    const incomingMessages = conversations.filter(c => c.direction === 'in');
    const outgoingMessages = conversations.filter(c => c.direction === 'out');
    const aiMessages = conversations.filter(c => c.aiGenerated);

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (let i = 1; i < conversations.length; i++) {
      const current = conversations[i];
      const previous = conversations[i - 1];
      
      if (current.direction === 'in' && previous.direction === 'out') {
        const responseTime = new Date(current.sentAt).getTime() - new Date(previous.sentAt).getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    const avgResponseTimeHours = responseCount > 0 ? totalResponseTime / (1000 * 60 * 60 * responseCount) : 0;

    // Calculate engagement score (0-100)
    const messageCount = conversations.length;
    const responseRate = outgoingMessages.length > 0 ? (incomingMessages.length / outgoingMessages.length) * 100 : 0;
    const recentActivity = conversations.filter(c => {
      const sentAt = new Date(c.sentAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return sentAt > weekAgo;
    }).length;

    const engagementScore = Math.min(100, Math.round(
      (messageCount * 5) + 
      (responseRate * 0.5) + 
      (recentActivity * 10) + 
      (avgResponseTimeHours < 24 ? 20 : 0)
    ));

    // Determine sentiment (simplified analysis)
    const recentMessages = conversations.slice(-5);
    const positiveWords = ['great', 'good', 'excellent', 'perfect', 'love', 'awesome', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'disappointing'];
    
    let sentimentScore = 0;
    recentMessages.forEach(msg => {
      const text = msg.body.toLowerCase();
      positiveWords.forEach(word => {
        if (text.includes(word)) sentimentScore += 1;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) sentimentScore -= 1;
      });
    });

    const sentiment = sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral';

    return {
      totalMessages: messageCount,
      incomingCount: incomingMessages.length,
      outgoingCount: outgoingMessages.length,
      aiCount: aiMessages.length,
      avgResponseTimeHours: Math.round(avgResponseTimeHours * 10) / 10,
      responseRate: Math.round(responseRate),
      engagementScore,
      sentiment,
      lastReplyAt: lead.lastReplyAt
    };
  }, [lead.conversations, lead.lastReplyAt]);

  const formatResponseTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      return `${Math.round(hours / 24)}d`;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5" />
          Conversation Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.totalMessages}</div>
            <div className="text-xs text-gray-600">Total Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.incomingCount}</div>
            <div className="text-xs text-gray-600">Customer Replies</div>
          </div>
        </div>

        {/* Response Time */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-sm">Avg Response Time</span>
          </div>
          <div className="text-lg font-semibold">
            {metrics.avgResponseTimeHours > 0 ? formatResponseTime(metrics.avgResponseTimeHours) : 'N/A'}
          </div>
          {metrics.lastReplyAt && (
            <div className="text-xs text-gray-600">
              Last reply: {new Date(metrics.lastReplyAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Engagement Score */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-sm">Engagement Score</span>
          </div>
          <Badge className={getEngagementColor(metrics.engagementScore)}>
            {metrics.engagementScore}/100
          </Badge>
        </div>

        {/* Sentiment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-sm">Recent Sentiment</span>
          </div>
          <Badge className={getSentimentColor(metrics.sentiment)}>
            {metrics.sentiment}
          </Badge>
        </div>

        {/* AI Stats */}
        {metrics.aiCount > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-sm">AI Activity</div>
            <div className="text-sm text-gray-600">
              {metrics.aiCount} AI messages sent
            </div>
            <div className="text-sm text-gray-600">
              {metrics.responseRate}% response rate
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationMetricsCard;
