
import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode.react";

interface UserQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
}

const UserQRCodeModal: React.FC<UserQRCodeModalProps> = ({ open, onOpenChange, user }) => {
  if (!user) return null;
  const value = user.id; // Or encode additional details as needed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-2">
          <div className="font-medium text-lg">{user.first_name} {user.last_name}</div>
          <div className="text-xs text-slate-600">{user.email}</div>
          <QRCode value={value} size={180} level="H" includeMargin />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserQRCodeModal;
