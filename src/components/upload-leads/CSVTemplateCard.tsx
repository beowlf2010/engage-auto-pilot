
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const CSVTemplateCard = () => {
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

  return (
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
  );
};

export default CSVTemplateCard;
