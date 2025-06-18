
import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  UserX,
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";

interface AIStatusBadgeProps {
  aiOptIn: boolean;
  pendingHumanResponse: boolean;
  aiSequencePaused: boolean;
  aiStage?: string;
}

const AIStatusBadge: React.FC<AIStatusBadgeProps> = ({
  aiOptIn,
  pendingHumanResponse,
  aiSequencePaused,
  aiStage
}) => {
  if (!aiOptIn) {
    return <Badge variant="secondary" className="flex items-center gap-1">
      <UserX className="w-3 h-3" />
      Disabled
    </Badge>;
  }

  if (pendingHumanResponse) {
    return <Badge variant="destructive" className="flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      Waiting for Human
    </Badge>;
  }

  if (aiSequencePaused) {
    return <Badge variant="outline" className="flex items-center gap-1">
      <Clock className="w-3 h-3" />
      Paused
    </Badge>;
  }

  if (aiStage) {
    return <Badge variant="default" className="flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      {aiStage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>;
  }

  return <Badge variant="secondary">Ready</Badge>;
};

export default AIStatusBadge;
