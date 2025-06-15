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
import ReconServiceLines from "@/components/inventory/ReconServiceLines";
import VehicleInfoCard from "./vehicle/VehicleInfoCard";
import VehicleTimelineCard from "./vehicle/VehicleTimelineCard";
import VehicleActionsCard from "./vehicle/VehicleActionsCard";
import VehicleLinkedLeadsCard from "./vehicle/VehicleLinkedLeadsCard";

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
          <VehicleInfoCard vehicle={vehicleWithDeals} getStatusColor={getStatusColor} />

          {/* Deal History */}
          <DealHistory
            deals={vehicleWithDeals.deals}
            stockNumber={vehicleWithDeals.stock_number}
          />

          {/* Linked Leads */}
          {linkedLeads && linkedLeads.length > 0 && (
            <VehicleLinkedLeadsCard linkedLeads={linkedLeads} />
          )}

          {/* Recon Service Lines */}
          <ReconServiceLines inventoryId={vehicleWithDeals.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <VehicleTimelineCard vehicle={vehicleWithDeals} />

          {/* Actions */}
          <VehicleActionsCard
            stockNumber={vehicleWithDeals.stock_number}
            sourceReport={vehicleWithDeals.source_report}
          />
        </div>
      </div>
    </div>
  );
};

export default VehicleDetail;
