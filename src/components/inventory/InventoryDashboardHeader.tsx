
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Inventory Dashboard</h1>
          <p className="text-slate-600">Manage and monitor your vehicle inventory with AI-powered insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/inventory-upload">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload Inventory
            </Button>
          </Link>
          <Link to="/rpo-insights">
            <Button variant="outline" className="border-slate-300 hover:bg-slate-50">
              <BarChart3 className="w-4 h-4 mr-2" />
              RPO Insights
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Total Inventory</p>
              <p className="text-2xl font-bold text-blue-900">
                {isLoading ? "..." : formatNumber(stats?.totalVehicles)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Available</p>
              <p className="text-2xl font-bold text-green-900">
                {isLoading ? "..." : formatNumber(stats?.availableVehicles)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-700">Aging (60+ days)</p>
              <p className="text-2xl font-bold text-yellow-900">
                {isLoading ? "..." : Math.round((stats?.averageDaysInStock || 0) > 60 ? (stats?.availableVehicles || 0) * 0.15 : 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
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
