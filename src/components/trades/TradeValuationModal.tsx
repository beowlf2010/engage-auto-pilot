
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Save } from 'lucide-react';
import { createTradeValuation } from '@/services/tradeVehicleService';
import { toast } from '@/hooks/use-toast';
import type { TradeVehicle } from '@/types/trade';

interface TradeValuationModalProps {
  tradeVehicle: TradeVehicle;
  isOpen: boolean;
  onClose: () => void;
  onValuationAdded: () => void;
}

const TradeValuationModal = ({ tradeVehicle, isOpen, onClose, onValuationAdded }: TradeValuationModalProps) => {
  const [formData, setFormData] = useState({
    valuationSource: 'manual' as 'kbb' | 'edmunds' | 'manual' | 'dealer_estimate',
    tradeInValue: 0,
    privatePartyValue: 0,
    retailValue: 0,
    estimatedValue: 0,
    marketConditions: '',
    valuationNotes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await createTradeValuation({
        tradeVehicleId: tradeVehicle.id,
        valuationDate: new Date().toISOString().split('T')[0],
        ...formData
      });
      
      toast({
        title: "Success",
        description: "Trade valuation saved successfully"
      });
      
      onValuationAdded();
    } catch (error) {
      console.error('Error saving valuation:', error);
      toast({
        title: "Error",
        description: "Failed to save valuation",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Trade Valuation - {tradeVehicle.year} {tradeVehicle.make} {tradeVehicle.model}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="valuationSource">Valuation Source</Label>
            <Select 
              value={formData.valuationSource} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, valuationSource: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kbb">Kelley Blue Book</SelectItem>
                <SelectItem value="edmunds">Edmunds</SelectItem>
                <SelectItem value="manual">Manual Appraisal</SelectItem>
                <SelectItem value="dealer_estimate">Dealer Estimate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tradeInValue">Trade-in Value</Label>
              <Input
                id="tradeInValue"
                type="number"
                value={formData.tradeInValue}
                onChange={(e) => setFormData(prev => ({ ...prev, tradeInValue: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="privatePartyValue">Private Party Value</Label>
              <Input
                id="privatePartyValue"
                type="number"
                value={formData.privatePartyValue}
                onChange={(e) => setFormData(prev => ({ ...prev, privatePartyValue: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retailValue">Retail Value</Label>
              <Input
                id="retailValue"
                type="number"
                value={formData.retailValue}
                onChange={(e) => setFormData(prev => ({ ...prev, retailValue: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="estimatedValue">Our Estimate</Label>
              <Input
                id="estimatedValue"
                type="number"
                value={formData.estimatedValue}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="marketConditions">Market Conditions</Label>
            <Input
              id="marketConditions"
              value={formData.marketConditions}
              onChange={(e) => setFormData(prev => ({ ...prev, marketConditions: e.target.value }))}
              placeholder="e.g., High demand, Low inventory"
            />
          </div>

          <div>
            <Label htmlFor="valuationNotes">Valuation Notes</Label>
            <Textarea
              id="valuationNotes"
              value={formData.valuationNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, valuationNotes: e.target.value }))}
              placeholder="Additional notes about the valuation..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Valuation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TradeValuationModal;
