
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Target, TrendingUp, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const StandaloneEnhancedProcessPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleQuickDemo = async (sourceBucket: string, leadType: string, aggression: number) => {
    setLoading(true);
    try {
      // Simulate process creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Enhanced Process Preview",
        description: `This would create a ${sourceBucket} + ${leadType} process with aggression level ${aggression}`,
      });
    } catch (error) {
      console.error('Error previewing enhanced process:', error);
      toast({
        title: "Error",
        description: "Failed to preview enhanced process",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAggressionColor = (level: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || colors[3];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Enhanced AI Process System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          Intelligent messaging processes based on lead source, type, and behavior patterns.
          Select leads from the table to assign processes, or preview the available combinations below.
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">
              Select leads from the table to assign processes
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Preview Process Combinations
          </h4>
          
          <div className="grid grid-cols-1 gap-2">
            {/* High-conversion combinations */}
            <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 onClick={() => handleQuickDemo('marketplace', 'retail_1', 4)}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Marketplace + Retail</span>
                  <p className="text-xs text-gray-600">High-energy deal approach</p>
                </div>
                <Badge className={getAggressionColor(4)}>
                  Aggression 4/5
                </Badge>
              </div>
            </div>

            <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 onClick={() => handleQuickDemo('phone_up', 'finance_2', 5)}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Phone Up + Finance</span>
                  <p className="text-xs text-gray-600">Direct action financing focus</p>
                </div>
                <Badge className={getAggressionColor(5)}>
                  Aggression 5/5
                </Badge>
              </div>
            </div>

            <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 onClick={() => handleQuickDemo('website_forms', 'trade_in_5', 3)}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Website + Trade-In</span>
                  <p className="text-xs text-gray-600">Professional value assessment</p>
                </div>
                <Badge className={getAggressionColor(3)}>
                  Aggression 3/5
                </Badge>
              </div>
            </div>

            <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                 onClick={() => handleQuickDemo('referral_repeat', 'retail_1', 2)}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Referral + Retail</span>
                  <p className="text-xs text-gray-600">VIP relationship approach</p>
                </div>
                <Badge className={getAggressionColor(2)}>
                  Aggression 2/5
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="text-xs text-gray-500">
            <strong>Enhanced Features:</strong>
            <ul className="mt-1 space-y-1">
              <li>• ≤160 character messages with smart timing</li>
              <li>• Source-specific tone and voice adaptation</li>
              <li>• Lead type overlays for specialized CTAs</li>
              <li>• 08:00-19:00 send window optimization</li>
              <li>• Status-aware message progression</li>
            </ul>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading preview...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StandaloneEnhancedProcessPanel;
