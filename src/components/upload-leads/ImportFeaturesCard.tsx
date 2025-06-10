
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const ImportFeaturesCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Import Features</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-slate-600">
          <p>• Smart field mapping with auto-detection</p>
          <p>• Multiple phone number support with priority</p>
          <p>• Automatic phone number deduplication</p>
          <p>• Contact preference enforcement (Do Not Call/Email)</p>
          <p>• Vehicle information combination</p>
          <p>• Salesperson assignment matching</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportFeaturesCard;
