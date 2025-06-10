
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PhonePriorityCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Phone Priority System</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">1. Cell Phone</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Primary</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">2. Day Phone</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Secondary</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">3. Evening Phone</span>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Tertiary</span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t">
            Finn AI will start with cell phone and automatically rotate to backup numbers if needed
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhonePriorityCard;
