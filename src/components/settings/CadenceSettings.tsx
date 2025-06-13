
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CadenceSettingsProps {
  userRole: string;
}

const CadenceSettings = ({ userRole }: CadenceSettingsProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Follow-up Cadence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Message Templates</Label>
              <div className="space-y-3">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Label className="text-sm font-medium">Initial Contact</Label>
                  </div>
                  <Textarea 
                    defaultValue="Hi {first_name}! Thanks for your interest in the {vehicle_interest}. I'd love to help you find the perfect vehicle. When would be a good time to chat?"
                    className="text-sm"
                    rows={3}
                    disabled={userRole === "sales"}
                  />
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Label className="text-sm font-medium">Follow-up 1</Label>
                  </div>
                  <Textarea 
                    defaultValue="Hi {first_name}, just wanted to follow up on your interest in the {vehicle_interest}. We have some great financing options available. Would you like to schedule a test drive?"
                    className="text-sm"
                    rows={3}
                    disabled={userRole === "sales"}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Label>Timing Settings</Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="delay1">Initial delay (hours)</Label>
                  <Input 
                    id="delay1" 
                    type="number" 
                    defaultValue="0" 
                    className="w-20"
                    disabled={userRole === "sales"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="delay2">Follow-up 1 delay (days)</Label>
                  <Input 
                    id="delay2" 
                    type="number" 
                    defaultValue="2" 
                    className="w-20"
                    disabled={userRole === "sales"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="delay3">Follow-up 2 delay (days)</Label>
                  <Input 
                    id="delay3" 
                    type="number" 
                    defaultValue="5" 
                    className="w-20"
                    disabled={userRole === "sales"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="max_followups">Max follow-ups</Label>
                  <Input 
                    id="max_followups" 
                    type="number" 
                    defaultValue="3" 
                    className="w-20"
                    disabled={userRole === "sales"}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadenceSettings;
