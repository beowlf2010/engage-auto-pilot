
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <div className="text-sm text-gray-600">Analyzing data quality & generating message...</div>
      </div>
    </div>
  );
};

export default LoadingState;
