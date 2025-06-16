
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Car, Eye, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

// Simple version to test if basic rendering works
const InventoryDashboard = () => {
  console.log('InventoryDashboard component rendering - SIMPLE VERSION');
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Basic query without complex filtering
  const { data: inventory, isLoading, error } = useQuery({
    queryKey: ['inventory-basic'],
    queryFn: async () => {
      console.log('Fetching basic inventory data...');
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .limit(10);
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Basic inventory data received:', data?.length, 'records');
        return data || [];
      } catch (err) {
        console.error('Query error:', err);
        throw err;
      }
    }
  });

  console.log('Render state:', { isLoading, error: !!error, dataCount: inventory?.length });

  if (error) {
    console.error('Rendering error state:', error);
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading inventory: {error.message}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage and analyze your vehicle inventory</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/upload-inventory-report">
            <Button className="flex items-center space-x-2">
              <Car className="w-4 h-4" />
              <span>Upload Inventory</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Simple Search */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-800">Search</h3>
        </div>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search vehicles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Simple Inventory Display */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Vehicle Inventory</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading inventory...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inventory && inventory.length > 0 ? (
              inventory.map((vehicle, index) => (
                <div key={vehicle.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Stock: {vehicle.stock_number || 'N/A'} | VIN: {vehicle.vin || 'N/A'}
                      </p>
                      {vehicle.price && (
                        <p className="text-lg font-semibold text-green-600">
                          ${vehicle.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{vehicle.status || 'available'}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No vehicles found</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default InventoryDashboard;
