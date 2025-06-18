
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Car, Save, X } from 'lucide-react';
import type { TradeVehicle } from '@/types/trade';

interface TradeVehicleFormProps {
  tradeVehicle?: TradeVehicle;
  onSave: (tradeVehicle: Omit<TradeVehicle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  leadId: string;
}

const TradeVehicleForm = ({ tradeVehicle, onSave, onCancel, leadId }: TradeVehicleFormProps) => {
  const [formData, setFormData] = useState({
    year: tradeVehicle?.year || new Date().getFullYear(),
    make: tradeVehicle?.make || '',
    model: tradeVehicle?.model || '',
    trim: tradeVehicle?.trim || '',
    mileage: tradeVehicle?.mileage || 0,
    condition: tradeVehicle?.condition || 'good' as const,
    vin: tradeVehicle?.vin || '',
    exteriorColor: tradeVehicle?.exteriorColor || '',
    interiorColor: tradeVehicle?.interiorColor || '',
    transmission: tradeVehicle?.transmission || '',
    drivetrain: tradeVehicle?.drivetrain || '',
    fuelType: tradeVehicle?.fuelType || '',
    accidentHistory: tradeVehicle?.accidentHistory || false,
    serviceRecords: tradeVehicle?.serviceRecords || false,
    titleType: tradeVehicle?.titleType || 'clean',
    liensOutstanding: tradeVehicle?.liensOutstanding || false,
    modifications: tradeVehicle?.modifications || '',
    additionalNotes: tradeVehicle?.additionalNotes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      leadId,
      ...formData,
      photos: tradeVehicle?.photos || []
    });
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Car className="h-5 w-5" />
          <span>{tradeVehicle ? 'Edit Trade Vehicle' : 'Add Trade Vehicle'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={formData.year.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={formData.make}
                onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                placeholder="e.g., Toyota"
                required
              />
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="e.g., Camry"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trim">Trim Level</Label>
              <Input
                id="trim"
                value={formData.trim}
                onChange={(e) => setFormData(prev => ({ ...prev, trim: e.target.value }))}
                placeholder="e.g., LE, XLE, Limited"
              />
            </div>

            <div>
              <Label htmlFor="mileage">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData(prev => ({ ...prev, mileage: parseInt(e.target.value) || 0 }))}
                placeholder="Enter mileage"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select value={formData.condition} onValueChange={(value: any) => setFormData(prev => ({ ...prev, condition: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="very_good">Very Good</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={formData.vin}
                onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                placeholder="17-character VIN"
                maxLength={17}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="exteriorColor">Exterior Color</Label>
              <Input
                id="exteriorColor"
                value={formData.exteriorColor}
                onChange={(e) => setFormData(prev => ({ ...prev, exteriorColor: e.target.value }))}
                placeholder="e.g., White, Black, Silver"
              />
            </div>

            <div>
              <Label htmlFor="interiorColor">Interior Color</Label>
              <Input
                id="interiorColor"
                value={formData.interiorColor}
                onChange={(e) => setFormData(prev => ({ ...prev, interiorColor: e.target.value }))}
                placeholder="e.g., Black, Beige, Gray"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accidentHistory"
                checked={formData.accidentHistory}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, accidentHistory: checked as boolean }))}
              />
              <Label htmlFor="accidentHistory">Has accident history</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="serviceRecords"
                checked={formData.serviceRecords}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, serviceRecords: checked as boolean }))}
              />
              <Label htmlFor="serviceRecords">Service records available</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="liensOutstanding"
                checked={formData.liensOutstanding}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, liensOutstanding: checked as boolean }))}
              />
              <Label htmlFor="liensOutstanding">Outstanding liens</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="modifications">Modifications</Label>
            <Textarea
              id="modifications"
              value={formData.modifications}
              onChange={(e) => setFormData(prev => ({ ...prev, modifications: e.target.value }))}
              placeholder="Describe any modifications or aftermarket parts..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
              placeholder="Any additional information about the vehicle..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Save Trade Vehicle
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TradeVehicleForm;
