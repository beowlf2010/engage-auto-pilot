import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InventoryFieldMapper from "./inventory-mapper/InventoryFieldMapper";
import { InventoryFieldMapping } from "./inventory-mapper/types";

interface InventoryFieldMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingComplete: (mapping: InventoryFieldMapping, transformer: (row: Record<string, any>) => Record<string, any>) => void;
}

const InventoryFieldMappingModal = ({
  isOpen,
  onClose,
  csvHeaders,
  sampleData,
  onMappingComplete
}: InventoryFieldMappingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map Inventory Fields</DialogTitle>
        </DialogHeader>
        
        <InventoryFieldMapper
          csvHeaders={csvHeaders}
          sampleData={sampleData}
          onMappingComplete={(mapping, transformer) => {
            onMappingComplete(mapping, transformer);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default InventoryFieldMappingModal;