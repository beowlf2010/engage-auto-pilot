
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Car, MessageSquare, TrendingUp } from "lucide-react";

interface ConversationMemoryProps {
  leadId: number;
}

const ConversationMemory = ({ leadId }: ConversationMemoryProps) => {
  // Mock memory data that Finn would learn over time
  const [memoryData] = useState({
    preferences: [
      { type: "vehicle", value: "Tesla Model 3", confidence: 0.9 },
      { type: "budget", value: "$45,000 - $55,000", confidence: 0.7 },
      { type: "timeline", value: "Within 2 months", confidence: 0.8 },
      { type: "financing", value: "Prefers low monthly payments", confidence: 0.6 }
    ],
    interactions: [
      { type: "response_time", value: "Usually responds within 2 hours", pattern: "fast_responder" },
      { type: "communication_style", value: "Prefers detailed information", pattern: "detail_oriented" },
      { type: "engagement", value: "High interest in features", pattern: "feature_focused" }
    ],
    learningInsights: [
      "Customer is price-sensitive but values quality",
      "Responds well to technical specifications",
      "Interested in environmental benefits"
    ]
  });

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <span>Finn's Memory</span>
        </CardTitle>
        <p className="text-sm text-slate-600">AI-learned customer insights</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Preferences */}
        <div>
          <h4 className="font-medium text-slate-800 mb-2 flex items-center space-x-1">
            <Car className="w-4 h-4" />
            <span>Preferences</span>
          </h4>
          <div className="space-y-2">
            {memoryData.preferences.map((pref, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 capitalize">{pref.type}:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{pref.value}</span>
                  <Badge variant={pref.confidence > 0.8 ? "default" : "secondary"} className="text-xs">
                    {Math.round(pref.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interaction Patterns */}
        <div>
          <h4 className="font-medium text-slate-800 mb-2 flex items-center space-x-1">
            <MessageSquare className="w-4 h-4" />
            <span>Communication Patterns</span>
          </h4>
          <div className="space-y-2">
            {memoryData.interactions.map((interaction, index) => (
              <div key={index} className="text-sm">
                <span className="text-slate-600">{interaction.value}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {interaction.pattern}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Insights */}
        <div>
          <h4 className="font-medium text-slate-800 mb-2 flex items-center space-x-1">
            <TrendingUp className="w-4 h-4" />
            <span>AI Insights</span>
          </h4>
          <div className="space-y-1">
            {memoryData.learningInsights.map((insight, index) => (
              <div key={index} className="text-xs text-slate-600 bg-purple-50 p-2 rounded">
                {insight}
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center pt-2 border-t">
          Finn learns from every interaction to improve responses
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversationMemory;
