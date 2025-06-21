
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail } from 'lucide-react';

interface LeadAIStatusCardProps {
  aiOptIn: boolean;
}

const LeadAIStatusCard: React.FC<LeadAIStatusCardProps> = ({ aiOptIn }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4" />
          AI Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant={aiOptIn ? 'default' : 'secondary'}>
            {aiOptIn ? 'AI Enabled' : 'AI Disabled'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadAIStatusCard;
