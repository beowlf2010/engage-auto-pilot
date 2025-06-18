
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Car } from 'lucide-react';
import TradeVehicleForm from './TradeVehicleForm';
import TradeVehicleCard from './TradeVehicleCard';
import TradeValuationModal from './TradeValuationModal';
import { getTradeVehiclesByLeadId, createTradeVehicle, updateTradeVehicle, getTradeValuations } from '@/services/tradeVehicleService';
import { toast } from '@/hooks/use-toast';
import type { TradeVehicle, TradeValuation } from '@/types/trade';

interface TradeManagementSectionProps {
  leadId: string;
  leadName: string;
}

const TradeManagementSection = ({ leadId, leadName }: TradeManagementSectionProps) => {
  const [tradeVehicles, setTradeVehicles] = useState<TradeVehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TradeVehicle | null>(null);
  const [valuationModalVehicle, setValuationModalVehicle] = useState<TradeVehicle | null>(null);
  const [vehicleValuations, setVehicleValuations] = useState<Record<string, TradeValuation[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTradeVehicles();
  }, [leadId]);

  const loadTradeVehicles = async () => {
    try {
      setLoading(true);
      const vehicles = await getTradeVehiclesByLeadId(leadId);
      setTradeVehicles(vehicles);
      
      // Load valuations for each vehicle
      const valuationsMap: Record<string, TradeValuation[]> = {};
      for (const vehicle of vehicles) {
        const valuations = await getTradeValuations(vehicle.id);
        valuationsMap[vehicle.id] = valuations;
      }
      setVehicleValuations(valuationsMap);
    } catch (error) {
      console.error('Error loading trade vehicles:', error);
      toast({
        title: "Error",
        description: "Failed to load trade vehicles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVehicle = async (vehicleData: Omit<TradeVehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingVehicle) {
        await updateTradeVehicle(editingVehicle.id, vehicleData);
        toast({
          title: "Success",
          description: "Trade vehicle updated successfully"
        });
      } else {
        await createTradeVehicle(vehicleData);
        toast({
          title: "Success",
          description: "Trade vehicle added successfully"
        });
      }
      
      setShowForm(false);
      setEditingVehicle(null);
      loadTradeVehicles();
    } catch (error) {
      console.error('Error saving trade vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to save trade vehicle",
        variant: "destructive"
      });
    }
  };

  const handleEditVehicle = (vehicle: TradeVehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleValueVehicle = (vehicle: TradeVehicle) => {
    setValuationModalVehicle(vehicle);
  };

  const handleScheduleAppraisal = (vehicle: TradeVehicle) => {
    // TODO: Implement appointment scheduling
    toast({
      title: "Coming Soon",
      description: "Appraisal scheduling will be available soon"
    });
  };

  const getLatestValuation = (vehicleId: string): TradeValuation | undefined => {
    const valuations = vehicleValuations[vehicleId] || [];
    return valuations[0]; // Assuming they're sorted by creation date desc
  };

  if (showForm) {
    return (
      <TradeVehicleForm
        tradeVehicle={editingVehicle || undefined}
        onSave={handleSaveVehicle}
        onCancel={() => {
          setShowForm(false);
          setEditingVehicle(null);
        }}
        leadId={leadId}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5" />
              <span>Trade Vehicles</span>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Trade Vehicle
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading trade vehicles...</div>
          ) : tradeVehicles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No trade vehicles added yet</p>
              <p className="text-sm">Add a trade vehicle to get started with valuations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tradeVehicles.map((vehicle) => (
                <TradeVehicleCard
                  key={vehicle.id}
                  tradeVehicle={vehicle}
                  latestValuation={getLatestValuation(vehicle.id)}
                  onEdit={() => handleEditVehicle(vehicle)}
                  onValue={() => handleValueVehicle(vehicle)}
                  onScheduleAppraisal={() => handleScheduleAppraisal(vehicle)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {valuationModalVehicle && (
        <TradeValuationModal
          tradeVehicle={valuationModalVehicle}
          isOpen={!!valuationModalVehicle}
          onClose={() => setValuationModalVehicle(null)}
          onValuationAdded={() => {
            loadTradeVehicles();
            setValuationModalVehicle(null);
          }}
        />
      )}
    </>
  );
};

export default TradeManagementSection;
