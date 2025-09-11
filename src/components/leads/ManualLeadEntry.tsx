import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { insertSingleLead } from "@/utils/leadOperations/singleLeadInserter";
import { ProcessedLead } from "@/components/upload-leads/duplicateDetection";
import { useQueryClient } from "@tanstack/react-query";

interface ManualLeadEntryProps {
  onLeadAdded?: () => void;
}

const ManualLeadEntry: React.FC<ManualLeadEntryProps> = ({ onLeadAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    vehicleInterest: ''
  });
  const queryClient = useQueryClient();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      vehicleInterest: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phoneNumber.trim() || !formData.vehicleInterest.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Convert form data to ProcessedLead format
      const processedLead: ProcessedLead = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumbers: [{
          id: '', // Will be set by database
          number: formData.phoneNumber.trim(),
          type: 'cell',
          priority: 1,
          status: 'active',
          isPrimary: true
        }],
        primaryPhone: formData.phoneNumber.trim(),
        email: '', // Optional field
        address: '',
        city: '',
        state: '',
        postalCode: '',
        vehicleInterest: formData.vehicleInterest.trim(),
        source: 'Manual Entry',
        doNotCall: false,
        doNotEmail: false,
        doNotMail: false,
        status: 'new'
      };

      const result = await insertSingleLead(processedLead);

      if (result.success) {
        toast({
          title: "Success",
          description: "Lead added successfully!"
        });
        
        resetForm();
        setOpen(false);
        
        // Refresh the leads list
        queryClient.invalidateQueries({ 
          queryKey: ['leads'] 
        });
        
        onLeadAdded?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add lead",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding lead:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="Enter phone number"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vehicleInterest">Vehicle Interest *</Label>
              <Input
                id="vehicleInterest"
                value={formData.vehicleInterest}
                onChange={(e) => handleInputChange('vehicleInterest', e.target.value)}
                placeholder="e.g., 2023 Honda Civic"
                disabled={loading}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Lead'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManualLeadEntry;