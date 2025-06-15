
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface VehicleLinkedLeadsCardProps {
  linkedLeads: any[];
}

const VehicleLinkedLeadsCard: React.FC<VehicleLinkedLeadsCardProps> = ({ linkedLeads }) => (
  <Card className="p-6">
    <div className="flex items-center space-x-2 mb-4">
      <Users className="w-5 h-5 text-slate-600" />
      <h3 className="text-lg font-medium text-slate-800">Linked Leads ({linkedLeads.length})</h3>
    </div>
    <div className="space-y-3">
      {linkedLeads.map((lead) => (
        <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
          <div>
            <p className="font-medium text-slate-800">{lead.first_name} {lead.last_name}</p>
            <p className="text-sm text-slate-600">{lead.vehicle_interest}</p>
          </div>
          <div className="text-right">
            <Badge variant="outline">{lead.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default VehicleLinkedLeadsCard;
