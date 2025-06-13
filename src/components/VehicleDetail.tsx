import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Eye, Users, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import DealHistory from "./vehicle/DealHistory";
import { getVehicleWithDeals } from "@/services/vehicleIntegrationService";

const VehicleDetail = () => {
  const { identifier } = useParams();

  const { data: vehicleWithDeals, isLoading } = useQuery({
    queryKey: ['vehicle-with-deals', identifier],
    queryFn: async () => {
      if (!identifier) throw new Error('No identifier provided');
      return await getVehicleWithDeals(identifier);
    },
    enabled: !!identifier
  });

  const { data: linkedLeads } = useQuery({
    queryKey: ['vehicle-leads', vehicleWithDeals?.vin, vehicleWithDeals?.stock_number],
    queryFn: async () => {
      if (!vehicleWithDeals) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .or(`vehicle_vin.eq.${vehicleWithDeals.vin},vehicle_interest.ilike.%${vehicleWithDeals.stock_number}%`);
      
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleWithDeals
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="h-64 bg-slate-200 rounded"></div>
            </div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicleWithDeals) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-slate-800">Vehicle not found</h2>
        <p className="text-slate-600 mt-2">The vehicle you're looking for could not be found.</p>
        <Link to="/inventory-dashboard">
          <Button className="mt-4">Back to Inventory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/inventory-dashboard">
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Inventory</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {vehicleWithDeals.year} {vehicleWithDeals.make} {vehicleWithDeals.model}
          </h1>
          <p className="text-slate-600 mt-1">
            {vehicleWithDeals.trim && `${vehicleWithDeals.trim} • `}
            Stock: {vehicleWithDeals.stock_number} • VIN: {vehicleWithDeals.vin}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-800">Vehicle Information</h3>
              <Badge className={getStatusColor(vehicleWithDeals.status)}>
                {vehicleWithDeals.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Year</p>
                <p className="text-slate-800">{vehicleWithDeals.year}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Make</p>
                <p className="text-slate-800">{vehicleWithDeals.make}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Model</p>
                <p className="text-slate-800">{vehicleWithDeals.model}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Trim</p>
                <p className="text-slate-800">{vehicleWithDeals.trim || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Body Style</p>
                <p className="text-slate-800">{vehicleWithDeals.body_style || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Mileage</p>
                <p className="text-slate-800">
                  {vehicleWithDeals.mileage ? vehicleWithDeals.mileage.toLocaleString() + ' miles' : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Exterior Color</p>
                <p className="text-slate-800">{vehicleWithDeals.color_exterior || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Interior Color</p>
                <p className="text-slate-800">{vehicleWithDeals.color_interior || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Engine</p>
                <p className="text-slate-800">{vehicleWithDeals.engine || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Transmission</p>
                <p className="text-slate-800">{vehicleWithDeals.transmission || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Deal History - NEW */}
          <DealHistory 
            deals={vehicleWithDeals.deals} 
            stockNumber={vehicleWithDeals.stock_number}
          />

          {/* Linked Leads */}
          {linkedLeads && linkedLeads.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-medium text-slate-800">Linked Leads ({linkedLeads.length})</h3>
              </div>
              <div className="space-y-3">
                {linkedLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div>
                      <p className="font-medium text-slate-800">{lead.first_name} {lead.last_name}</p>
                      <p className="text-sm text-slate-600">{lead.vehicle_interest}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{lead.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-medium text-slate-800">Timeline</h3>
            </div>
            <div className="space-y-3">
              {vehicleWithDeals.first_seen_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">First Seen</span>
                  <span className="text-sm font-medium text-slate-800">
                    {formatDistanceToNow(new Date(vehicleWithDeals.first_seen_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {vehicleWithDeals.last_seen_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Last Seen</span>
                  <span className="text-sm font-medium text-slate-800">
                    {formatDistanceToNow(new Date(vehicleWithDeals.last_seen_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {vehicleWithDeals.sold_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Sold</span>
                  <span className="text-sm font-medium text-slate-800">
                    {formatDistanceToNow(new Date(vehicleWithDeals.sold_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {vehicleWithDeals.days_in_inventory !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Days in Inventory</span>
                  <span className="text-sm font-medium text-slate-800">
                    {vehicleWithDeals.days_in_inventory} days
                  </span>
                </div>
              )}
              {vehicleWithDeals.deals.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Deals</span>
                  <span className="text-sm font-medium text-slate-800">
                    {vehicleWithDeals.deals.length}
                  </span>
                </div>
              )}
              {vehicleWithDeals.leads_count > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Linked Leads</span>
                  <span className="text-sm font-medium text-slate-800">
                    {vehicleWithDeals.leads_count}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Actions</h3>
            <div className="space-y-2">
              <Link to={`/financial-dashboard?search=${vehicleWithDeals.stock_number}`}>
                <Button className="w-full" variant="outline">
                  View Financial Details
                </Button>
              </Link>
              <Button className="w-full" variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                View Full Data
              </Button>
              {vehicleWithDeals.source_report && (
                <Button className="w-full" variant="outline">
                  Source: {vehicleWithDeals.source_report.replace('_', ' ').toUpperCase()}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetail;
