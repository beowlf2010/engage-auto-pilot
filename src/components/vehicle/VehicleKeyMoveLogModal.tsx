
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { logKeyMove } from "@/services/inventory/keyMoveService";
import { toast } from "@/hooks/use-toast";
// Use named import per "react-qr-reader" v3+
import { QrReader } from "react-qr-reader";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicle: any;
  user: any;
}

const VehicleKeyMoveLogModal: React.FC<Props> = ({ open, onOpenChange, vehicle, user }) => {
  const [step, setStep] = useState<"user"|"vehicle"|"done">("user");
  const [userId, setUserId] = useState<string|undefined>();
  const [scannedVehicleId, setScannedVehicleId] = useState<string|undefined>();
  const [actionType, setActionType] = useState<"checked_out"|"returned">("checked_out");
  const [loading, setLoading] = useState(false);

  // Only set one scan result per modal opening
  const [userScanDone, setUserScanDone] = useState(false);
  const [vehicleScanDone, setVehicleScanDone] = useState(false);

  const handleLog = async () => {
    if (!userId || !vehicle?.id) return;
    setLoading(true);
    try {
      await logKeyMove({
        inventoryId: vehicle.id,
        movedBy: userId,
        actionType,
      });
      toast({ title: "Key move logged!" });
      setStep("done");
    } catch {
      toast({ title: "Failed to log key move", variant: "destructive" });
    }
    setLoading(false);
    onOpenChange(false);
  };

  // For desktop/testing, skip scan and use logged-in user
  const desktopApprove = async () => {
    setLoading(true);
    try {
      await logKeyMove({
        inventoryId: vehicle.id,
        movedBy: user.id,
        actionType,
      });
      toast({ title: "Key move logged!" });
      setStep("done");
    } catch {
      toast({ title: "Failed to log key move", variant: "destructive" });
    }
    setLoading(false);
    onOpenChange(false);
  };

  // Reset scan state when modal is opened/closed
  React.useEffect(() => {
    if (!open) {
      setStep("user");
      setUserId(undefined);
      setScannedVehicleId(undefined);
      setLoading(false);
      setUserScanDone(false);
      setVehicleScanDone(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Key Movement</DialogTitle>
        </DialogHeader>
        <div>
          <div className="mb-2">
            <label className="font-medium mr-2">Action:</label>
            <select
              value={actionType}
              onChange={e => setActionType(e.target.value as any)}
              className="rounded border px-2 py-1"
            >
              <option value="checked_out">Check Out</option>
              <option value="returned">Return</option>
              <option value="scanned">Other</option>
            </select>
          </div>
          {step === "user" ? (
            <div>
              <div>Please scan your User QR code below:</div>
              <div className="w-full">
                <QrReader
                  constraints={{ facingMode: "environment" }}
                  onResult={(result, error) => {
                    if (userScanDone) return;
                    if (result?.getText()) {
                      setUserId(result.getText());
                      setStep("vehicle");
                      setUserScanDone(true);
                    }
                    if (error && error.name !== "NotFoundException") {
                      toast({ title: "Camera error", description: error.message, variant: "destructive" });
                    }
                  }}
                />
              </div>
              <Button className="w-full mt-2" variant="outline" onClick={desktopApprove}>Skip Scan (Use My Account)</Button>
            </div>
          ) : step === "vehicle" ? (
            <div>
              <div>Now scan the Vehicle QR code:</div>
              <div className="w-full">
                <QrReader
                  constraints={{ facingMode: "environment" }}
                  onResult={(result, error) => {
                    if (vehicleScanDone) return;
                    if (result?.getText()) {
                      setScannedVehicleId(result.getText());
                      setVehicleScanDone(true);
                    }
                    if (error && error.name !== "NotFoundException") {
                      toast({ title: "Camera error", description: error.message, variant: "destructive" });
                    }
                  }}
                />
              </div>
              <Button
                disabled={!scannedVehicleId || loading}
                className="w-full mt-2"
                onClick={handleLog}
              >
                Log Key Move
              </Button>
            </div>
          ) : (
            <div className="text-green-600">Key move logged for this vehicle!</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleKeyMoveLogModal;

