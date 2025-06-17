
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fixGMGlobalVehicleRecord } from "@/services/inventory/gmGlobalFixService";
import { Wrench, RefreshCw } from "lucide-react";

interface FixGMGlobalButtonProps {
  stockNumber: string;
  onVehicleUpdated?: () => void;
}

const FixGMGlobalButton: React.FC<FixGMGlobalButtonProps> = ({ 
  stockNumber, 
  onVehicleUpdated 
}) => {
  const [fixing, setFixing] = useState(false);
  const { toast } = useToast();

  const handleFix = async () => {
    setFixing(true);
    try {
      await fixGMGlobalVehicleRecord(stockNumber);
      
      toast({
        title: "Vehicle data fixed!",
        description: "GM Global fields have been re-extracted and corrected.",
      });
      
      // Trigger a refresh of the parent component
      if (onVehicleUpdated) {
        onVehicleUpdated();
      }
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error fixing vehicle:', error);
      toast({
        title: "Fix failed",
        description: error instanceof Error ? error.message : "Failed to fix vehicle data",
        variant: "destructive"
      });
    } finally {
      setFixing(false);
    }
  };

  return (
    <Button 
      onClick={handleFix} 
      disabled={fixing}
      variant="outline"
      size="sm"
      className="flex items-center space-x-2"
    >
      {fixing ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <Wrench className="w-4 h-4" />
      )}
      <span>{fixing ? 'Fixing...' : 'Fix GM Global Data'}</span>
    </Button>
  );
};

export default FixGMGlobalButton;
