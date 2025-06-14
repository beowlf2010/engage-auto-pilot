
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, Plus, Star, Clock, AlertTriangle, Check, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PhoneNumber {
  id: string;
  number: string;
  type: string;
  isPrimary: boolean;
  status: string;
  lastAttempt?: string;
  priority: number;
}

interface EnhancedPhoneManagerProps {
  phoneNumbers: PhoneNumber[];
  onPhoneSelect: (phoneNumber: PhoneNumber) => void;
  onAddPhone?: (phone: { number: string; type: string }) => Promise<void>;
  onUpdatePhone?: (phoneId: string, updates: Partial<PhoneNumber>) => Promise<void>;
  onDeletePhone?: (phoneId: string) => Promise<void>;
  onSetPrimary?: (phoneId: string) => Promise<void>;
}

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const number = cleaned.slice(1);
    return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
  } else if (cleaned.length === 10) {
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <Check className="w-3 h-3 text-green-500" />;
    case 'failed':
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    case 'opted_out':
      return <AlertTriangle className="w-3 h-3 text-orange-500" />;
    default:
      return <Clock className="w-3 h-3 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'opted_out':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const EnhancedPhoneManager: React.FC<EnhancedPhoneManagerProps> = ({
  phoneNumbers,
  onPhoneSelect,
  onAddPhone,
  onUpdatePhone,
  onDeletePhone,
  onSetPrimary
}) => {
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState({ number: '', type: 'cell' });
  const [editingPhone, setEditingPhone] = useState<string | null>(null);

  const sortedPhones = [...phoneNumbers].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.priority - b.priority;
  });

  const handleAddPhone = async () => {
    if (!newPhone.number.trim()) return;
    
    try {
      await onAddPhone?.(newPhone);
      setNewPhone({ number: '', type: 'cell' });
      setIsAddingPhone(false);
      toast({
        title: "Phone number added",
        description: "The phone number has been added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add phone number",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (phoneId: string) => {
    try {
      await onSetPrimary?.(phoneId);
      toast({
        title: "Primary phone updated",
        description: "The primary phone number has been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update primary phone",
        variant: "destructive",
      });
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    try {
      await onDeletePhone?.(phoneId);
      toast({
        title: "Phone number deleted",
        description: "The phone number has been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete phone number",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Phone className="w-4 h-4" />
            <span>Phone Numbers</span>
          </span>
          {onAddPhone && (
            <Dialog open={isAddingPhone} onOpenChange={setIsAddingPhone}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Phone Number</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      value={newPhone.number}
                      onChange={(e) => setNewPhone(prev => ({ ...prev, number: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select 
                      value={newPhone.type} 
                      onValueChange={(value) => setNewPhone(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cell">Cell</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="eve">Evening</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleAddPhone} className="flex-1">
                      Add Phone Number
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingPhone(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {sortedPhones.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No phone numbers</p>
          </div>
        ) : (
          sortedPhones.map((phone) => (
            <div
              key={phone.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {phone.isPrimary && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{formatPhoneNumber(phone.number)}</span>
                    <Badge variant="outline" className="text-xs">
                      {phone.type}
                    </Badge>
                    <Badge className={`text-xs ${getStatusColor(phone.status)}`}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(phone.status)}
                        <span>{phone.status}</span>
                      </span>
                    </Badge>
                  </div>
                  {phone.lastAttempt && (
                    <p className="text-xs text-muted-foreground">
                      Last attempt: {new Date(phone.lastAttempt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPhoneSelect(phone)}
                  className="h-8"
                >
                  Call
                </Button>
                
                {!phone.isPrimary && onSetPrimary && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSetPrimary(phone.id)}
                    className="h-8 px-2"
                    title="Set as primary"
                  >
                    <Star className="w-3 h-3" />
                  </Button>
                )}
                
                {onDeletePhone && phoneNumbers.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePhone(phone.id)}
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete phone number"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedPhoneManager;
