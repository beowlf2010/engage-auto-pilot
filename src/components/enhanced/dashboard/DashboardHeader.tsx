
import React from 'react';
import GlassCard from '@/components/ui/glass-card';
import { BarChart3 } from 'lucide-react';

interface DashboardHeaderProps {
  firstName: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ firstName }) => {
  return (
    <div className="relative">
      <GlassCard opacity="medium" className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              Here's what's happening with your dealership today
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
              <BarChart3 className="h-16 w-16 text-white" />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default DashboardHeader;
