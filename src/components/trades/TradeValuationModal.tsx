
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Calculator, Save } from 'lucide-react';
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
    valuationSource: 'dealer_estimate' as const,
    tradeInValue: 0,
    privatePartyValue: 0,
    retailValue: 0,
    wholesaleValue: 0,
    estimatedValue: 0,
    marketConditions: '',
    valuationNotes: '',
    isFinalOffer: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createTradeValuation({
        tradeVehicleId: tradeVehicle.id,
        valuationSource: formData.valuationSource,
        tradeInValue: formData.tradeInValue || undefined,
        privatePartyValue: formData.privatePartyValue || undefined,
        retailValue: formData.retailValue || undefined,
        wholesaleValue: formData.wholesaleValue || undefined,
        estimatedValue: formData.estimatedValue || undefined,
        valuationDate: new Date().toISOString().split('T')[0],
        marketConditions: formData.marketConditions || undefined,
        valuationNotes: formData.valuationNotes || undefined,
        isFinalOffer: formData.isFinalOffer
      });

      toast({
        title: "Success",
        description: "Trade valuation added successfully"
      });

      onValuationAdded();
    } catch (error) {
      console.error('Error creating trade valuation:', error);
      toast({
        title: "Error",
        description: "Failed to create trade valuation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Value Trade Vehicle</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {tradeVehicle.year} {tradeVehicle.make} {tradeVehicle.model} • {tradeVehicle.mileage?.toLocaleString()} miles
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                <SelectItem value="dealer_estimate">Dealer Estimate</SelectItem>
                <SelectItem value="kbb">Kelley Blue Book</SelectItem>
                <SelectItem value="edmunds">Edmunds</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tradeInValue">Trade-in Value</Label>
              <Input
                id="tradeInValue"
                type="number"
                step="0.01"
                value={formData.tradeInValue || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tradeInValue: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="privatePartyValue">Private Party Value</Label>
              <Input
                id="privatePartyValue"
                type="number"
                step="0.01"
                value={formData.privatePartyValue || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, privatePartyValue: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retailValue">Retail Value</Label>
              <Input
                id="retailValue"
                type="number"
                step="0.01"
                value={formData.retailValue || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, retailValue: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="wholesaleValue">Wholesale Value</Label>
              <Input
                id="wholesaleValue"
                type="number"
                step="0.01"
                value={formData.wholesaleValue || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, wholesaleValue: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <Label htmlFor="estimatedValue" className="text-green-800 font-medium">Our Estimated Offer</Label>
            <Input
              id="estimatedValue"
              type="number"
              step="0.01"
              value={formData.estimatedValue || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              className="mt-1 border-green-200 focus:border-green-500"
            />
            {formData.estimatedValue > 0 && (
              <p className="text-sm text-green-700 mt-1">
                Formatted: {formatCurrency(formData.estimatedValue)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="marketConditions">Market Conditions</Label>
            <Select 
              value={formData.marketConditions} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, marketConditions: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select market conditions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strong">Strong Market</SelectItem>
                <SelectItem value="normal">Normal Market</SelectItem>
                <SelectItem value="soft">Soft Market</SelectItem>
                <SelectItem value="declining">Declining Market</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="valuationNotes">Valuation Notes</Label>
            <Textarea
              id="valuationNotes"
              value={formData.valuationNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, valuationNotes: e.target.value }))}
              placeholder="Add any notes about the valuation..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Valuation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TradeValuationModal;
