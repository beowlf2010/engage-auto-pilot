
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const SystemInfoCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Automation Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>⏰ <strong>Schedule:</strong> Every 15 minutes during business hours (8 AM - 8 PM Central)</div>
          <div>🚀 <strong>Super Aggressive:</strong> 3 messages on day 1 (2-6 hours apart)</div>
          <div>⚡ <strong>Aggressive:</strong> Messages every 8-16 hours</div>
          <div>🤝 <strong>Gentle:</strong> Messages every 1-3 days</div>
          <div>⏸️ <strong>Auto-pause:</strong> Sequences pause when customers reply</div>
          <div>🛡️ <strong>Safety:</strong> Max 5 messages per lead per day</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemInfoCard;
