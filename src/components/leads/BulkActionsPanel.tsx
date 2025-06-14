
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MessageSquare, 
  Bot, 
  UserCheck, 
  Download,
  X,
  Send
} from "lucide-react";

interface BulkActionsPanelProps {
  selectedCount: number;
  onClose: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkAiToggle: (enabled: boolean) => void;
  onBulkMessage: (message: string) => void;
  onBulkAssign: (salespersonId: string) => void;
  onBulkExport: () => void;
  salespeople: Array<{ id: string; name: string }>;
}

const BulkActionsPanel = ({
  selectedCount,
  onClose,
  onBulkStatusUpdate,
  onBulkAiToggle,
  onBulkMessage,
  onBulkAssign,
  onBulkExport,
  salespeople
}: BulkActionsPanelProps) => {
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState('');

  const handleBulkMessage = () => {
    if (bulkMessage.trim()) {
      onBulkMessage(bulkMessage.trim());
      setBulkMessage('');
    }
  };

  const handleStatusUpdate = () => {
    if (selectedStatus) {
      onBulkStatusUpdate(selectedStatus);
      setSelectedStatus('');
    }
  };

  const handleAssignment = () => {
    if (selectedSalesperson) {
      onBulkAssign(selectedSalesperson);
      setSelectedSalesperson('');
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" />
            Bulk Actions
            <Badge variant="secondary">{selectedCount} selected</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Actions Row */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAiToggle(true)}
          >
            <Bot className="h-3 w-3 mr-1" />
            Enable AI
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAiToggle(false)}
          >
            <Bot className="h-3 w-3 mr-1" />
            Disable AI
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onBulkExport}
          >
            <Download className="h-3 w-3 mr-1" />
            Export Selected
          </Button>
        </div>

        {/* Status Update */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Status</label>
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleStatusUpdate}
                disabled={!selectedStatus}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Assign Salesperson */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign To</label>
            <div className="flex gap-2">
              <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  {salespeople.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAssignment}
                disabled={!selectedSalesperson}
              >
                <UserCheck className="h-3 w-3 mr-1" />
                Assign
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Send Bulk Message</label>
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message here... (will be sent to all selected leads)"
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              className="flex-1 min-h-[80px]"
              maxLength={160}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleBulkMessage}
                disabled={!bulkMessage.trim()}
              >
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
              <div className="text-xs text-muted-foreground">
                {bulkMessage.length}/160
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkActionsPanel;
