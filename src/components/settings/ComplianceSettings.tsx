
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ClipboardList, FileText } from "lucide-react";

/** Placeholder: Export audit log as CSV/PDF (UI actions only for now) */
export const ComplianceAuditExport: React.FC = () => (
  <Card className="p-6 flex flex-col space-y-2">
    <h2 className="text-lg font-bold mb-2 flex items-center"><ClipboardList className="w-4 h-4 mr-2" /> Compliance Audit Log</h2>
    <Button variant="outline" className="mb-2">
      <Download className="w-4 h-4 mr-2" /> Export as CSV
    </Button>
    <Button variant="outline" disabled>
      <FileText className="w-4 h-4 mr-2" /> Export as PDF (coming soon)
    </Button>
    <p className="text-xs text-muted-foreground mt-1">
      Download full consent history and suppression records for your compliance records.
    </p>
  </Card>
);

/** Placeholder: Display channel-specific disclaimers and message window settings */
export const ComplianceDisclaimers: React.FC = () => (
  <Card className="p-6 flex flex-col space-y-2">
    <h2 className="text-lg font-bold mb-2">Compliance Disclaimers/Settings</h2>
    <div>
      <strong>SMS Message Window:</strong> 8:00 AM - 7:00 PM<br />
      <strong>SMS Disclaimer:</strong> "Message & data rates may apply. Reply STOP to opt out."
    </div>
    <div className="mt-2">
      <strong>Email Disclaimer:</strong> "You may unsubscribe at any time by clicking the link in our emails."
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      To edit these disclaimers, update Compliance Settings in the Admin console.
    </p>
  </Card>
);
