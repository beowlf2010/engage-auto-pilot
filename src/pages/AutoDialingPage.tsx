import React from 'react';
import AutoDialQueue from '@/components/calling/AutoDialQueue';
import { Phone } from 'lucide-react';

const AutoDialingPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center space-x-3 mb-6">
        <Phone className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Auto-Dialing Queue</h1>
      </div>
      
      <AutoDialQueue />
    </div>
  );
};

export default AutoDialingPage;