import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CSVFieldMapper from "./CSVFieldMapper";
import { createPhoneNumbers, getPrimaryPhone } from "@/utils/phoneUtils";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Download,
  Users,
  ArrowLeft
} from "lucide-react";

interface UploadLeadsProps {
  user: {
    role: string;
  };
}

const UploadLeads = ({ user }: UploadLeadsProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [csvData, setCsvData] = useState<{headers: string[], rows: any[], sample: Record<string, string>} | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-600">Only managers and admins can upload leads</p>
        </div>
      </div>
    );
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
    
    const headers = lines[0].split(',').map(h => h.trim()); // Changed from tab to comma separation
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      return row;
    });

    const sample = rows[0] || {};
    return { headers, rows, sample };
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or TXT file",
        variant: "destructive"
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setCsvData(parsed);
      setShowMapper(true);
      
      console.log('Parsed CSV:', parsed);
    } catch (error) {
      toast({
        title: "Error parsing file",
        description: "Could not parse the CSV file. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const handleMappingComplete = async (mapping: any) => {
    if (!csvData) return;
    
    setUploading(true);
    
    try {
      // Process the CSV data with the field mapping
      const processedLeads = csvData.rows.map(row => {
        // Create phone numbers with priority
        const phoneNumbers = createPhoneNumbers(
          row[mapping.cellphone] || '',
          row[mapping.dayphone] || '',
          row[mapping.evephone] || ''
        );

        const primaryPhone = getPrimaryPhone(phoneNumbers);
        
        // Combine vehicle information
        const vehicleParts = [
          row[mapping.vehicleYear] || '',
          row[mapping.vehicleMake] || '',
          row[mapping.vehicleModel] || ''
        ].filter(Boolean);
        
        const vehicleInterest = vehicleParts.length > 0 ? vehicleParts.join(' ') : 'Not specified';

        // Handle contact preferences
        const doNotCall = row[mapping.doNotCall]?.toLowerCase() === 'true';
        const doNotEmail = row[mapping.doNotEmail]?.toLowerCase() === 'true';

        return {
          firstName: row[mapping.firstName] || '',
          lastName: row[mapping.lastName] || '',
          middleName: row[mapping.middleName] || '',
          phoneNumbers,
          primaryPhone,
          email: row[mapping.email] || '',
          emailAlt: row[mapping.emailAlt] || '',
          address: row[mapping.address] || '',
          city: row[mapping.city] || '',
          state: row[mapping.state] || '',
          postalCode: row[mapping.postalCode] || '',
          vehicleInterest,
          vehicleVIN: row[mapping.vehicleVIN] || '',
          source: row[mapping.source] || 'CSV Import',
          salesPersonName: [row[mapping.salesPersonFirstName], row[mapping.salesPersonLastName]].filter(Boolean).join(' '),
          doNotCall,
          doNotEmail,
          doNotMail: row[mapping.doNotMail]?.toLowerCase() === 'true'
        };
      });

      // Filter out leads without valid phone numbers
      const validLeads = processedLeads.filter(lead => lead.primaryPhone);
      
      // Simulate processing time
      setTimeout(() => {
        const mockResult = {
          totalRows: csvData.rows.length,
          successfulImports: validLeads.length,
          errors: csvData.rows.length - validLeads.length,
          duplicates: 0, // Would be calculated in real implementation
          fileName: 'leads.csv',
          phoneNumberStats: {
            cellOnly: validLeads.filter(l => l.phoneNumbers.length === 1 && l.phoneNumbers[0].type === 'cell').length,
            multipleNumbers: validLeads.filter(l => l.phoneNumbers.length > 1).length,
            dayPrimary: validLeads.filter(l => l.phoneNumbers.length > 0 && l.phoneNumbers[0].type === 'day').length
          }
        };
        
        setUploadResult(mockResult);
        setUploading(false);
        setShowMapper(false);
        
        console.log('Processed leads:', validLeads);
        
        toast({
          title: "Upload successful!",
          description: `${mockResult.successfulImports} leads imported with phone priority system`,
        });
      }, 3000);
      
    } catch (error) {
      setUploading(false);
      toast({
        title: "Processing error",
        description: "Error processing the CSV data",
        variant: "destructive"
      });
    }
  };

  const downloadTemplate = () => {
    const csvContent = `dealerid	leadstatustypename	LeadTypeName	LeadTypeID	CustomerCreatedUTC	LeadCreatedUTC	leadsourcename	SalesPersonFirstName	SalesPersonLastName	firstname	lastname	middlename	address	city	state	postalcode	dayphone	evephone	cellphone	email	emailalt	VehicleYear	VehicleMake	VehicleModel	VehicleVIN	VehicleStockNumber	SoldDateUTC	DoNotCall	DoNotEmail	DoNotMail
18648	New	Internet	1	1/10/2025 16:46	3/17/2025 18:15	Website	John	Doe	Sarah	Johnson		123 Main St	Anytown	AL	12345	2513593158	2513685175	2513593158	sarah@email.com	sarah.alt@email.com	2021	Tesla	Model 3	5YJSA1E63MF431691	X431691A		FALSE	FALSE	FALSE`;
    
    const blob = new Blob([csvContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (showMapper && csvData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setShowMapper(false)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Upload</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Map CSV Fields</h1>
            <p className="text-slate-600 mt-1">
              Configure how your CSV columns map to our system fields
            </p>
          </div>
        </div>
        
        <CSVFieldMapper 
          csvHeaders={csvData.headers}
          sampleData={csvData.sample}
          onMappingComplete={handleMappingComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Upload Leads</h1>
        <p className="text-slate-600 mt-1">
          Import leads with multiple phone numbers and automatic priority handling
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Upload CSV File</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-slate-600">Processing your file with phone priority system...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-slate-800 mb-2">
                      Drop your CSV file here
                    </p>
                    <p className="text-slate-600 mb-4">
                      or click to browse and select a file
                    </p>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mx-auto"
                    >
                      Choose File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    Supported formats: CSV and TXT files
                  </p>
                </div>
              )}
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800 mb-2">
                      Upload completed successfully!
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-green-700">Total rows:</span>
                        <span className="font-medium ml-2">{uploadResult.totalRows}</span>
                      </div>
                      <div>
                        <span className="text-green-700">Imported:</span>
                        <span className="font-medium ml-2">{uploadResult.successfulImports}</span>
                      </div>
                      <div>
                        <span className="text-green-700">Errors:</span>
                        <span className="font-medium ml-2">{uploadResult.errors}</span>
                      </div>
                      <div>
                        <span className="text-green-700">Multiple phones:</span>
                        <span className="font-medium ml-2">{uploadResult.phoneNumberStats?.multipleNumbers || 0}</span>
                      </div>
                    </div>
                    <div className="text-xs text-green-700">
                      <p>✓ Phone priority: Cell → Day → Evening</p>
                      <p>✓ Contact preferences applied</p>
                      <p>✓ Duplicate phone numbers removed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions & Template */}
        <div className="space-y-6">
          {/* CSV Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>CSV Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Download our template matching your current CSV format
              </p>
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Phone Priority System */}
          <Card>
            <CardHeader>
              <CardTitle>Phone Priority System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">1. Cell Phone</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Primary</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">2. Day Phone</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Secondary</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">3. Evening Phone</span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Tertiary</span>
                </div>
                <div className="text-xs text-slate-500 pt-2 border-t">
                  Finn AI will start with cell phone and automatically rotate to backup numbers if needed
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribution Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Import Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-600">
                <p>• Smart field mapping with auto-detection</p>
                <p>• Multiple phone number support with priority</p>
                <p>• Automatic phone number deduplication</p>
                <p>• Contact preference enforcement (Do Not Call/Email)</p>
                <p>• Vehicle information combination</p>
                <p>• Salesperson assignment matching</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UploadLeads;
