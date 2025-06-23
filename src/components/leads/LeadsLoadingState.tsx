
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const LeadsLoadingState = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading leads...</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadsLoadingState;
