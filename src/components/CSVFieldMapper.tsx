
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Phone, Mail, User, Car, Users, Shield } from "lucide-react";

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
  vehicleStockNumber?: string;
  source?: string;
  salesPersonFirstName?: string;
  salesPersonLastName?: string;
  doNotCall?: string;
  doNotEmail?: string;
  doNotMail?: string;
  leadType?: string;
  dealerId?: string;
}

const CSVFieldMapper = ({ csvHeaders, sampleData, onMappingComplete }: CSVFieldMapperProps) => {
  const [mapping, setMapping] = useState<FieldMapping>({
    firstName: '',
    lastName: ''
  });

  // Improved auto-detection with flexible matching
  const normalizeFieldName = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const findBestMatch = (targetField: string, headers: string[]): string => {
    const normalizedTarget = normalizeFieldName(targetField);
    
    // Exact match first
    for (const header of headers) {
      if (normalizeFieldName(header) === normalizedTarget) {
        return header;
      }
    }
    
    // Partial matches
    for (const header of headers) {
      const normalizedHeader = normalizeFieldName(header);
      if (normalizedHeader.includes(normalizedTarget) || normalizedTarget.includes(normalizedHeader)) {
        return header;
      }
    }
    
    return '';
  };

  // Auto-detect common field mappings with improved logic
  useEffect(() => {
    const autoMapping: FieldMapping = {
      firstName: '',
      lastName: ''
    };

    // Define field mapping patterns
    const fieldPatterns: Record<keyof FieldMapping, string[]> = {
      firstName: ['firstname', 'first_name', 'fname'],
      lastName: ['lastname', 'last_name', 'lname'],
      middleName: ['middlename', 'middle_name', 'mname'],
      cellphone: ['cellphone', 'cell_phone', 'mobile', 'cell'],
      dayphone: ['dayphone', 'day_phone', 'workphone', 'work_phone'],
      evephone: ['evephone', 'eve_phone', 'eveningphone', 'evening_phone'],
      email: ['email', 'emailaddress', 'email_address'],
      emailAlt: ['emailalt', 'email_alt', 'alternatemail', 'secondary_email'],
      address: ['address', 'street', 'streetaddress'],
      city: ['city'],
      state: ['state', 'province'],
      postalCode: ['postalcode', 'postal_code', 'zipcode', 'zip_code', 'zip'],
      vehicleYear: ['vehicleyear', 'vehicle_year', 'year'],
      vehicleMake: ['vehiclemake', 'vehicle_make', 'make'],
      vehicleModel: ['vehiclemodel', 'vehicle_model', 'model'],
      vehicleVIN: ['vehiclevin', 'vehicle_vin', 'vin'],
      vehicleStockNumber: ['vehiclestocknumber', 'vehicle_stock_number', 'stocknumber', 'stock_number'],
      source: ['leadsourcename', 'lead_source_name', 'source', 'lead_source'],
      salesPersonFirstName: ['salespersonfirstname', 'salesperson_first_name', 'sales_first_name'],
      salesPersonLastName: ['salespersonlastname', 'salesperson_last_name', 'sales_last_name'],
      doNotCall: ['donotcall', 'do_not_call', 'dnc'],
      doNotEmail: ['donotemail', 'do_not_email', 'dne'],
      doNotMail: ['donotmail', 'do_not_mail', 'dnm'],
      leadType: ['leadtypename', 'lead_type_name', 'leadtype', 'lead_type'],
      dealerId: ['dealerid', 'dealer_id', 'dealer']
    };

    // Apply pattern matching for each field
    Object.entries(fieldPatterns).forEach(([fieldKey, patterns]) => {
      for (const pattern of patterns) {
        const match = findBestMatch(pattern, csvHeaders);
        if (match) {
          autoMapping[fieldKey as keyof FieldMapping] = match;
          break;
        }
      }
    });

    setMapping(autoMapping);
  }, [csvHeaders]);

  const requiredFields = ['firstName', 'lastName'];
  const isValid = requiredFields.every(field => mapping[field as keyof FieldMapping]);

  const getSampleValue = (fieldKey: keyof FieldMapping): string => {
    const headerName = mapping[fieldKey];
    return headerName && sampleData[headerName] ? sampleData[headerName] : '';
  };

  const isAutoDetected = (fieldKey: keyof FieldMapping): boolean => {
    return !!mapping[fieldKey];
  };

  const fieldSections = [
    {
      title: "Required Fields",
      icon: User,
      fields: [
        { key: 'firstName' as keyof FieldMapping, label: 'First Name', required: true },
        { key: 'lastName' as keyof FieldMapping, label: 'Last Name', required: true },
        { key: 'middleName' as keyof FieldMapping, label: 'Middle Name', required: false }
      ]
    },
    {
      title: "Phone Numbers (Priority Order)",
      icon: Phone,
      fields: [
        { key: 'cellphone' as keyof FieldMapping, label: 'Cell Phone (Priority 1 - Primary)', required: false },
        { key: 'dayphone' as keyof FieldMapping, label: 'Day Phone (Priority 2 - Secondary)', required: false },
        { key: 'evephone' as keyof FieldMapping, label: 'Evening Phone (Priority 3 - Tertiary)', required: false }
      ]
    },
    {
      title: "Contact Information",
      icon: Mail,
      fields: [
        { key: 'email' as keyof FieldMapping, label: 'Primary Email', required: false },
        { key: 'emailAlt' as keyof FieldMapping, label: 'Alternate Email', required: false }
      ]
    },
    {
      title: "Address Information",
      icon: null,
      fields: [
        { key: 'address' as keyof FieldMapping, label: 'Street Address', required: false },
        { key: 'city' as keyof FieldMapping, label: 'City', required: false },
        { key: 'state' as keyof FieldMapping, label: 'State', required: false },
        { key: 'postalCode' as keyof FieldMapping, label: 'Postal Code', required: false }
      ]
    },
    {
      title: "Vehicle Information",
      icon: Car,
      fields: [
        { key: 'vehicleYear' as keyof FieldMapping, label: 'Vehicle Year', required: false },
        { key: 'vehicleMake' as keyof FieldMapping, label: 'Vehicle Make', required: false },
        { key: 'vehicleModel' as keyof FieldMapping, label: 'Vehicle Model', required: false },
        { key: 'vehicleVIN' as keyof FieldMapping, label: 'Vehicle VIN', required: false },
        { key: 'vehicleStockNumber' as keyof FieldMapping, label: 'Stock Number', required: false }
      ]
    },
    {
      title: "Salesperson Assignment",
      icon: Users,
      fields: [
        { key: 'salesPersonFirstName' as keyof FieldMapping, label: 'Salesperson First Name', required: false },
        { key: 'salesPersonLastName' as keyof FieldMapping, label: 'Salesperson Last Name', required: false }
      ]
    },
    {
      title: "Contact Preferences & Lead Data",
      icon: Shield,
      fields: [
        { key: 'doNotCall' as keyof FieldMapping, label: 'Do Not Call', required: false },
        { key: 'doNotEmail' as keyof FieldMapping, label: 'Do Not Email', required: false },
        { key: 'doNotMail' as keyof FieldMapping, label: 'Do Not Mail', required: false },
        { key: 'source' as keyof FieldMapping, label: 'Lead Source', required: false },
        { key: 'leadType' as keyof FieldMapping, label: 'Lead Type', required: false },
        { key: 'dealerId' as keyof FieldMapping, label: 'Dealer ID', required: false }
      ]
    }
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
        <p className="text-sm text-slate-600">
          {Object.keys(mapping).filter(key => mapping[key as keyof FieldMapping]).length} of {csvHeaders.length} fields auto-detected
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {fieldSections.map((section) => (
          <div key={section.title}>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              {section.icon && <section.icon className="w-4 h-4" />}
              <span>{section.title}</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {section.fields.map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1 flex items-center space-x-2">
                    <span>{label}</span>
                    {required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                    {isAutoDetected(key) && (
                      <Badge variant="secondary" className="text-xs">Auto-detected</Badge>
                    )}
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
                  {getSampleValue(key) && (
                    <p className="text-xs text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded">
                      Sample: {getSampleValue(key)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <Button 
            onClick={() => onMappingComplete(mapping)}
            disabled={!isValid}
            className="w-full"
          >
            Continue with Field Mapping ({Object.keys(mapping).filter(key => mapping[key as keyof FieldMapping]).length} fields mapped)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVFieldMapper;
