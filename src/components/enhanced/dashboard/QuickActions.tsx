
import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '@/components/ui/glass-card';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users, MessageSquare, Car } from 'lucide-react';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <GlassCard opacity="medium" className="p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        <Clock className="h-6 w-6 mr-2 text-green-600" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-blue-200"
          onClick={() => navigate('/leads')}
        >
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-gray-800">View All Leads</h4>
            <p className="text-sm text-gray-600 mt-2">Manage your lead pipeline</p>
          </CardContent>
        </Card>

        <Card 
          className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-green-200"
          onClick={() => navigate('/smart-inbox')}
        >
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-gray-800">Smart Inbox</h4>
            <p className="text-sm text-gray-600 mt-2">AI-powered conversations</p>
          </CardContent>
        </Card>

        <Card 
          className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-purple-200"
          onClick={() => navigate('/inventory')}
        >
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Car className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-gray-800">Inventory</h4>
            <p className="text-sm text-gray-600 mt-2">Manage vehicle inventory</p>
          </CardContent>
        </Card>
      </div>
    </GlassCard>
  );
};

export default QuickActions;
