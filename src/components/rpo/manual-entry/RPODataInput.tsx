
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clipboard, Brain } from 'lucide-react';

interface RPODataInputProps {
  sessionName: string;
  setSessionName: (name: string) => void;
  pastedData: string;
  setPastedData: (data: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
}

const RPODataInput: React.FC<RPODataInputProps> = ({
  sessionName,
  setSessionName,
  pastedData,
  setPastedData,
  onProcess,
  isProcessing
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clipboard className="h-5 w-5" />
          <span>Paste Order Screen Data</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="session-name">Session Name (Optional)</Label>
          <Input
            id="session-name"
            placeholder="e.g., 2024 Silverado Order Data"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="order-data">Order Screen Data</Label>
          <Textarea
            id="order-data"
            placeholder="Paste your order screen data here...
Example:
VIN: 1GCUDGED7NZ123456
Stock: C12345
RPO: L84 GU6 H0Y Z71 KC4
Description: 5.3L EcoTec3 V8 Engine, 3.42 Rear Axle, Jet Black Leather..."
            rows={8}
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
          />
        </div>

        <Button 
          onClick={onProcess} 
          disabled={isProcessing || !pastedData.trim()}
          className="w-full"
        >
          <Brain className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Process RPO Data'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RPODataInput;
