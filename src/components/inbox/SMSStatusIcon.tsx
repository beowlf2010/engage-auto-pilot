
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface SMSStatusIconProps {
  status: string;
  error?: string;
}

const SMSStatusIcon = ({ status, error }: SMSStatusIconProps) => {
  switch (status) {
    case 'sent':
    case 'delivered':
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'pending':
      return <Clock className="w-3 h-3 text-yellow-500" />;
    case 'failed':
      return <XCircle className="w-3 h-3 text-red-500" />;
    default:
      return <AlertCircle className="w-3 h-3 text-gray-500" />;
  }
};

export default SMSStatusIcon;
