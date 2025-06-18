
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Car, Calendar, Save } from 'lucide-react';
import { createTradeVehicle } from '@/services/tradeVehicleService';
import { toast } from '@/hooks/use-toast';

interface TradeInfoCollectorProps {
  leadId: string;
  leadName: string;
  onTradeCreated: (tradeVehicle: any) => void;
  onScheduleAppraisal: () => void;
}

const TradeInfoCollector = ({ leadId, leadName, onTradeCreated, onScheduleAppraisal }: TradeInfoCollectorProps) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear() - 5,
    make: '',
    model: '',
    trim: '',
    mileage: 0,
    condition: 'good' as const,
    vin: '',
    exteriorColor: '',
    accidentHistory: false,
    additionalNotes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.make || !formData.model) {
      toast({
        title: "Missing Information",
        description: "Please provide at least the make and model of the vehicle",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const tradeVehicle = await createTradeVehicle({
        leadId,
        ...formData,
        photos: []
      });
      
      toast({
        title: "Success",
        description: "Trade vehicle information saved successfully"
      });
      
      onTradeCreated(tradeVehicle);
      setIsCollecting(false);
    } catch (error) {
      console.error('Error saving trade vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to save trade vehicle information",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isCollecting) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Car className="h-8 w-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-semibold text-blue-900 mb-2">Trade Interest Detected</h3>
            <p className="text-sm text-blue-700 mb-4">
              {leadName} is interested in trading their vehicle. Let's collect some basic information.
            </p>
            <div className="flex space-x-2 justify-center">
              <Button 
                onClick={() => setIsCollecting(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Car className="h-4 w-4 mr-2" />
                Collect Trade Info
              </Button>
              <Button 
                variant="outline"
                onClick={onScheduleAppraisal}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Appraisal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Car className="h-5 w-5" />
          <span>Trade Vehicle Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="year">Year</Label>
            <Select 
              value={formData.year.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}
            >
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
            <Label htmlFor="make">Make *</Label>
            <Input
              id="make"
              value={formData.make}
              onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
              placeholder="e.g., Toyota, Honda"
              required
            />
          </div>

          <div>
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              placeholder="e.g., Camry, Accord"
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
              placeholder="e.g., LE, EX, Limited"
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
            <Select 
              value={formData.condition} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, condition: value }))}
            >
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
            <Label htmlFor="exteriorColor">Exterior Color</Label>
            <Input
              id="exteriorColor"
              value={formData.exteriorColor}
              onChange={(e) => setFormData(prev => ({ ...prev, exteriorColor: e.target.value }))}
              placeholder="e.g., White, Black, Silver"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="vin">VIN (if available)</Label>
          <Input
            id="vin"
            value={formData.vin}
            onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
            placeholder="17-character VIN"
            maxLength={17}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="accidentHistory"
            checked={formData.accidentHistory}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, accidentHistory: checked as boolean }))}
          />
          <Label htmlFor="accidentHistory">Vehicle has accident history</Label>
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsCollecting(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeInfoCollector;
