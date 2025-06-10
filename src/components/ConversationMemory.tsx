
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Car, MessageSquare, TrendingUp, Loader2 } from "lucide-react";
import { getLeadMemory } from "@/services/aiMemoryService";

interface ConversationMemoryProps {
  leadId: number;
}

const ConversationMemory = ({ leadId }: ConversationMemoryProps) => {
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemory = async () => {
      setLoading(true);
      const data = await getLeadMemory(leadId.toString());
      setMemoryData(data);
      setLoading(false);
    };

    fetchMemory();
  }, [leadId]);

  const groupedMemory = {
    preferences: memoryData.filter(m => m.memory_type === 'preference'),
    interactions: memoryData.filter(m => m.memory_type === 'interaction'),
    insights: memoryData.filter(m => m.memory_type === 'insight')
  };

  if (loading) {
    return (
      <Card className="w-80">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

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
        {groupedMemory.preferences.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-800 mb-2 flex items-center space-x-1">
              <Car className="w-4 h-4" />
              <span>Preferences</span>
            </h4>
            <div className="space-y-2">
              {groupedMemory.preferences.map((memory, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex-1">{memory.content}</span>
                  <Badge variant={memory.confidence > 0.8 ? "default" : "secondary"} className="text-xs ml-2">
                    {Math.round(memory.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interaction Patterns */}
        {groupedMemory.interactions.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-800 mb-2 flex items-center space-x-1">
              <MessageSquare className="w-4 h-4" />
              <span>Communication Patterns</span>
            </h4>
            <div className="space-y-2">
              {groupedMemory.interactions.map((memory, index) => (
                <div key={index} className="text-sm">
                  <span className="text-slate-600">{memory.content}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {Math.round(memory.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights */}
        {groupedMemory.insights.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-800 mb-2 flex items-center space-x-1">
              <TrendingUp className="w-4 h-4" />
              <span>AI Insights</span>
            </h4>
            <div className="space-y-1">
              {groupedMemory.insights.map((memory, index) => (
                <div key={index} className="text-xs text-slate-600 bg-purple-50 p-2 rounded">
                  {memory.content}
                </div>
              ))}
            </div>
          </div>
        )}

        {memoryData.length === 0 && (
          <div className="text-center text-slate-500 py-4">
            <Brain className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No memories yet</p>
            <p className="text-xs">Finn will learn from interactions</p>
          </div>
        )}

        <div className="text-xs text-slate-500 text-center pt-2 border-t">
          Finn learns from every interaction to improve responses
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversationMemory;
