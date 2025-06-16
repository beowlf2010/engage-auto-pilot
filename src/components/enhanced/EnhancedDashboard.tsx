
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInventoryStats } from '@/services/inventory/inventoryStatsService';
import DashboardHeader from './dashboard/DashboardHeader';
import MetricsCards from './dashboard/MetricsCards';
import ChartsSection from './dashboard/ChartsSection';
import QuickActions from './dashboard/QuickActions';

interface EnhancedDashboardProps {
  user: any;
}

const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({ user }) => {
  // Fetch real inventory data
  const { data: inventoryStats, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-stats-enhanced'],
    queryFn: getInventoryStats,
  });

  // Format inventory count with loading state
  const formatInventoryCount = () => {
    if (inventoryLoading) return "...";
    if (!inventoryStats) return "0";
    return inventoryStats.totalVehicles.toString();
  };

  // Format inventory subtitle with new/used breakdown
  const formatInventorySubtitle = () => {
    if (inventoryLoading) return "Loading...";
    if (!inventoryStats) return "No vehicles";
    
    const newCount = inventoryStats.newVehicles.available || 0;
    const usedCount = inventoryStats.usedVehicles.available || 0;
    return `${newCount} new, ${usedCount} used available`;
  };

  // Calculate trend - mock for now, could be enhanced with historical data
  const inventoryTrendValue = inventoryStats ? 
    ((inventoryStats.newVehicles.available + inventoryStats.usedVehicles.available) / inventoryStats.totalVehicles * 100) - 85 
    : 0;
  const inventoryTrendPositive = inventoryTrendValue >= 0;

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
      {/* Header Section */}
      <DashboardHeader firstName={user.firstName} />

      {/* Key Metrics Grid */}
      <MetricsCards
        inventoryCount={formatInventoryCount()}
        inventorySubtitle={formatInventorySubtitle()}
        inventoryTrendValue={inventoryTrendValue}
        inventoryTrendPositive={inventoryTrendPositive}
      />

      {/* Charts Section */}
      <ChartsSection />

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
};

export default EnhancedDashboard;
