
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface BusinessHoursSettingsProps {
  userRole: string;
}

const BusinessHoursSettings = ({ userRole }: BusinessHoursSettingsProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Operating Hours</Label>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                <div key={day} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch defaultChecked={day !== "Sunday"} disabled={userRole === "sales"} />
                    <Label className="w-20">{day}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="time" 
                      defaultValue="09:00" 
                      className="w-24"
                      disabled={userRole === "sales"}
                    />
                    <span className="text-slate-500">to</span>
                    <Input 
                      type="time" 
                      defaultValue="18:00" 
                      className="w-24"
                      disabled={userRole === "sales"}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-4">
              <Label>AI Behavior</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Send outside business hours</Label>
                  <Switch disabled={userRole === "sales"} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Weekend messaging</Label>
                  <Switch disabled={userRole === "sales"} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Holiday pause</Label>
                  <Switch defaultChecked disabled={userRole === "sales"} />
                </div>
              </div>
              
              <div className="pt-4">
                <Label>Time Zone</Label>
                <select className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md" disabled={userRole === "sales"}>
                  <option>Eastern Time (ET)</option>
                  <option>Central Time (CT)</option>
                  <option>Mountain Time (MT)</option>
                  <option>Pacific Time (PT)</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessHoursSettings;
