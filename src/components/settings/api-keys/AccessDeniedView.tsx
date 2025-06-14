
import { Key } from "lucide-react";

const AccessDeniedView = () => {
  return (
    <div className="text-center py-12">
      <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-slate-800 mb-2">Admin Access Required</h3>
      <p className="text-slate-600">Only administrators can manage API keys</p>
    </div>
  );
};

export default AccessDeniedView;
