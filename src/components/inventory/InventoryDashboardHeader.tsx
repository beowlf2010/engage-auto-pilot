
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, AlertCircle, Zap, Upload, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getInventoryStats } from "@/services/inventory/inventoryStatsService";

const InventoryDashboardHeader = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: getInventoryStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return "0";
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
            Inventory Dashboard
          </h1>
          <p className="text-muted-foreground">Manage and monitor your vehicle inventory with AI-powered insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/inventory-upload">
            <Button variant="gradient" className="shadow-[var(--shadow-glow)] hover:scale-105 transition-transform">
              <Upload className="w-4 h-4 mr-2" />
              Upload Inventory
            </Button>
          </Link>
          <Link to="/rpo-insights">
            <Button variant="glass" className="hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4 mr-2" />
              RPO Insights
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="floating" className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:shadow-[var(--shadow-floating)] transition-all animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary-glow rounded-lg shadow-[var(--shadow-glow)]">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Total Active Vehicles</p>
              <p className="text-2xl font-bold text-blue-900">
                {isLoading ? "..." : formatNumber(stats?.totalVehicles)}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="floating" className="p-4 bg-gradient-to-r from-success/10 to-success/5 border-success/20 hover:shadow-[var(--shadow-floating)] transition-all animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-success to-success/80 rounded-lg shadow-[var(--shadow-glow)]">
              <TrendingUp className="w-6 h-6 text-success-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">GM Global Orders</p>
              <p className="text-2xl font-bold text-green-900">
                {isLoading ? "..." : formatNumber(stats?.newVehicles.total)}
              </p>
              <p className="text-xs text-green-600">All new vehicles</p>
            </div>
          </div>
        </Card>

        <Card variant="floating" className="p-4 bg-gradient-to-r from-warning/10 to-warning/5 border-warning/20 hover:shadow-[var(--shadow-floating)] transition-all animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-warning to-warning/80 rounded-lg shadow-[var(--shadow-glow)]">
              <AlertCircle className="w-6 h-6 text-warning-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-700">Used Available</p>
              <p className="text-2xl font-bold text-yellow-900">
                {isLoading ? "..." : formatNumber(stats?.usedVehicles.available)}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="floating" className="p-4 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20 hover:shadow-[var(--shadow-floating)] transition-all animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-accent to-accent/80 rounded-lg shadow-[var(--shadow-glow)]">
              <Zap className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-700">Avg Days in Stock</p>
              <p className="text-2xl font-bold text-purple-900">
                {isLoading ? "..." : Math.round(stats?.averageDaysInStock || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Message */}
      {!isLoading && stats && (
        <div className="text-sm text-slate-500 text-center">
          Last updated: {new Date().toLocaleTimeString()} • Next refresh in 30 seconds
        </div>
      )}
    </div>
  );
};

export default InventoryDashboardHeader;
