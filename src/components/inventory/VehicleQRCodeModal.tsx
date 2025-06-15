import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode.react";

interface VehicleQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: any | null;
}

const VehicleQRCodeModal: React.FC<VehicleQRCodeModalProps> = ({
  open,
  onOpenChange,
  vehicle,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!vehicle) return null;

  // Encode VIN by default — could be extended to URL or other format
  const qrValue = vehicle.vin || vehicle.stock_number || vehicle.id;

  const handlePrint = () => {
    // Print only the QR code content
    if (printRef.current) {
      const content = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>Print QR Code</title>
            <style>
              body {
                font-family: sans-serif;
                text-align: center;
                padding: 0.5in;
              }
              .qr-info { margin-bottom: 12px; font-size: 1rem; }
              .qr-vin { font-size: 1.1rem; font-weight: bold; }
              .qr-title { margin-top: 0.5in; }
            </style>
          </head>
          <body>
            <div class="qr-title">
              <div class="qr-info">${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}</div>
              <div class="qr-vin">VIN: ${vehicle.vin || ""}</div>
              <div class="qr-vin">Stock #: ${vehicle.stock_number || ""}</div>
            </div>
            <div style="margin-top: 1in;">
              ${content}
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 350);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print QR Code</DialogTitle>
        </DialogHeader>
        <div className="mb-4 flex flex-col items-center space-y-2">
          <div>{vehicle.year} {vehicle.make} {vehicle.model}</div>
          <div className="text-xs text-slate-600">VIN: {vehicle.vin}</div>
          <div className="text-xs text-slate-600">Stock #: {vehicle.stock_number}</div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div ref={printRef} className="bg-white rounded p-4">
            <QRCode value={qrValue || "N/A"} size={168} level="H" includeMargin />
          </div>
          <Button onClick={handlePrint} className="w-full mt-2">
            Print QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleQRCodeModal;
