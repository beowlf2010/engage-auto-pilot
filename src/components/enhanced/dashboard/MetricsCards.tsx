
import React from 'react';
import AnimatedStatCard from '@/components/ui/animated-stat-card';
import { 
  Users, 
  MessageSquare, 
  DollarSign,
  Car
} from 'lucide-react';

interface MetricsCardsProps {
  inventoryCount: string;
  inventorySubtitle: string;
  inventoryTrendValue: number;
  inventoryTrendPositive: boolean;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({
  inventoryCount,
  inventorySubtitle,
  inventoryTrendValue,
  inventoryTrendPositive
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AnimatedStatCard
        title="Total Leads"
        value="1,247"
        icon={Users}
        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        trend={{ value: 12.5, isPositive: true }}
      />
      <AnimatedStatCard
        title="Active Conversations"
        value="89"
        icon={MessageSquare}
        gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        trend={{ value: 8.2, isPositive: true }}
      />
      <AnimatedStatCard
        title="Sales This Month"
        value="$127,500"
        icon={DollarSign}
        gradient="bg-gradient-to-br from-purple-500 to-purple-600"
        trend={{ value: 15.3, isPositive: true }}
      />
      <AnimatedStatCard
        title="Inventory Count"
        value={inventoryCount}
        icon={Car}
        gradient="bg-gradient-to-br from-orange-500 to-red-500"
        trend={{ 
          value: Math.abs(inventoryTrendValue), 
          isPositive: inventoryTrendPositive 
        }}
        subtitle={inventorySubtitle}
      />
    </div>
  );
};

export default MetricsCards;
