import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Phone, Mail, User } from "lucide-react";

interface CSVFieldMapperProps {
  csvHeaders: string[];
  sampleData: Record<string, string>;
  onMappingComplete: (mapping: FieldMapping) => void;
}

interface FieldMapping {
  firstName: string;
  lastName: string;
  middleName?: string;
  cellphone?: string;
  dayphone?: string;
  evephone?: string;
  email?: string;
  emailAlt?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  source?: string;
  salesPersonFirstName?: string;
  salesPersonLastName?: string;
  doNotCall?: string;
  doNotEmail?: string;
  doNotMail?: string;
}

const CSVFieldMapper = ({ csvHeaders, sampleData, onMappingComplete }: CSVFieldMapperProps) => {
  const [mapping, setMapping] = useState<FieldMapping>({
    firstName: '',
    lastName: ''
  });

  // Auto-detect common field mappings
  useEffect(() => {
    const autoMapping: FieldMapping = {
      firstName: '',
      lastName: ''
    };

    csvHeaders.forEach(header => {
      const lower = header.toLowerCase();
      
      // Name fields
      if (lower.includes('firstname') || lower === 'first_name') autoMapping.firstName = header;
      if (lower.includes('lastname') || lower === 'last_name') autoMapping.lastName = header;
      if (lower.includes('middlename') || lower === 'middle_name') autoMapping.middleName = header;
      
      // Phone fields - exact matches for your CSV
      if (lower === 'cellphone') autoMapping.cellphone = header;
      if (lower === 'dayphone') autoMapping.dayphone = header;
      if (lower === 'evephone') autoMapping.evephone = header;
      
      // Email fields
      if (lower === 'email') autoMapping.email = header;
      if (lower === 'emailalt') autoMapping.emailAlt = header;
      
      // Address fields
      if (lower === 'address') autoMapping.address = header;
      if (lower === 'city') autoMapping.city = header;
      if (lower === 'state') autoMapping.state = header;
      if (lower === 'postalcode' || lower === 'postal_code') autoMapping.postalCode = header;
      
      // Vehicle fields
      if (lower === 'vehicleyear') autoMapping.vehicleYear = header;
      if (lower === 'vehiclemake') autoMapping.vehicleMake = header;
      if (lower === 'vehiclemodel') autoMapping.vehicleModel = header;
      if (lower === 'vehiclevin') autoMapping.vehicleVIN = header;
      
      // Other fields
      if (lower === 'leadsourcename') autoMapping.source = header;
      if (lower === 'salespersonfirstname') autoMapping.salesPersonFirstName = header;
      if (lower === 'salespersonlastname') autoMapping.salesPersonLastName = header;
      if (lower === 'donotcall') autoMapping.doNotCall = header;
      if (lower === 'donotemail') autoMapping.doNotEmail = header;
      if (lower === 'donotmail') autoMapping.doNotMail = header;
    });

    setMapping(autoMapping);
  }, [csvHeaders]);

  const requiredFields = ['firstName', 'lastName'];
  const isValid = requiredFields.every(field => mapping[field as keyof FieldMapping]);

  const phoneFields = [
    { key: 'cellphone' as keyof FieldMapping, label: 'Cell Phone (Priority 1)', icon: Phone },
    { key: 'dayphone' as keyof FieldMapping, label: 'Day Phone (Priority 2)', icon: Phone },
    { key: 'evephone' as keyof FieldMapping, label: 'Evening Phone (Priority 3)', icon: Phone }
  ];

  const contactFields = [
    { key: 'email' as keyof FieldMapping, label: 'Primary Email', icon: Mail },
    { key: 'emailAlt' as keyof FieldMapping, label: 'Alternate Email', icon: Mail }
  ];

  const addressFields = [
    { key: 'address' as keyof FieldMapping, label: 'Street Address' },
    { key: 'city' as keyof FieldMapping, label: 'City' },
    { key: 'state' as keyof FieldMapping, label: 'State' },
    { key: 'postalCode' as keyof FieldMapping, label: 'Postal Code' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Map CSV Fields</span>
          {isValid ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Fields */}
        <div>
          <h4 className="font-medium mb-3 flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Required Fields</span>
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {requiredFields.map(field => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1 capitalize">
                  {field.replace(/([A-Z])/g, ' $1')}
                  <Badge variant="destructive" className="ml-1 text-xs">Required</Badge>
                </label>
                <select
                  value={mapping[field as keyof FieldMapping] || ''}
                  onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">Select field...</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
                {mapping[field as keyof FieldMapping] && sampleData[mapping[field as keyof FieldMapping]!] && (
                  <p className="text-xs text-slate-500 mt-1">
                    Sample: {sampleData[mapping[field as keyof FieldMapping]!]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Phone Numbers */}
        <div>
          <h4 className="font-medium mb-3">Phone Numbers (Priority Order)</h4>
          <div className="space-y-3">
            {phoneFields.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 flex items-center space-x-1">
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </label>
                <select
                  value={mapping[key] || ''}
                  onChange={(e) => setMapping({...mapping, [key]: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">Select field...</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
                {mapping[key] && sampleData[mapping[key]!] && (
                  <p className="text-xs text-slate-500 mt-1">
                    Sample: {sampleData[mapping[key]!]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Fields */}
        <div>
          <h4 className="font-medium mb-3">Contact Information</h4>
          <div className="grid grid-cols-2 gap-4">
            {contactFields.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 flex items-center space-x-1">
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </label>
                <select
                  value={mapping[key] || ''}
                  onChange={(e) => setMapping({...mapping, [key]: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">Select field...</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Address Fields */}
        <div>
          <h4 className="font-medium mb-3">Address Information</h4>
          <div className="grid grid-cols-2 gap-4">
            {addressFields.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <select
                  value={mapping[key] || ''}
                  onChange={(e) => setMapping({...mapping, [key]: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">Select field...</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={() => onMappingComplete(mapping)}
          disabled={!isValid}
          className="w-full"
        >
          Continue with Field Mapping
        </Button>
      </CardContent>
    </Card>
  );
};

export default CSVFieldMapper;
