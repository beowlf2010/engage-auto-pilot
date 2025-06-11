
import { AlertCircle } from "lucide-react";

const AccessDenied = () => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">Access Denied</h3>
        <p className="text-slate-600">Only managers and admins can upload inventory</p>
      </div>
    </div>
  );
};

export default AccessDenied;
