
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MessageSquare,
  Bot,
  User,
  Car,
  Clock
} from "lucide-react";

interface LeadsListProps {
  user: {
    role: string;
    id: string;
  };
}

const LeadsList = ({ user }: LeadsListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock leads data
  const mockLeads = [
    {
      id: 1,
      firstName: "Sarah",
      lastName: "Johnson",
      phone: "+1-555-0123",
      email: "sarah.j@email.com",
      vehicleInterest: "Tesla Model 3",
      source: "Website",
      status: "engaged",
      salesperson: "John Doe",
      salespersonId: "1",
      aiOptIn: true,
      aiStage: "follow_up_2",
      nextAiSendAt: "2024-06-10 14:30:00",
      createdAt: "2024-06-08 09:15:00",
      lastMessage: "Interested in financing options",
      unreadCount: 2
    },
    {
      id: 2,
      firstName: "Mike",
      lastName: "Chen",
      phone: "+1-555-0124",
      email: "mike.chen@email.com",
      vehicleInterest: "BMW X5",
      source: "Facebook Ad",
      status: "new",
      salesperson: "Jane Smith",
      salespersonId: "2",
      aiOptIn: true,
      aiStage: "initial",
      nextAiSendAt: "2024-06-10 16:00:00",
      createdAt: "2024-06-10 08:30:00",
      lastMessage: null,
      unreadCount: 0
    },
    {
      id: 3,
      firstName: "Emma",
      lastName: "Wilson",
      phone: "+1-555-0125",
      email: "emma.w@email.com",
      vehicleInterest: "Audi A4",
      source: "Referral",
      status: "paused",
      salesperson: "John Doe",
      salespersonId: "1",
      aiOptIn: false,
      aiStage: null,
      nextAiSendAt: null,
      createdAt: "2024-06-05 14:20:00",
      lastMessage: "Please stop messaging",
      unreadCount: 0
    }
  ];

  // Filter leads based on user role
  const filteredLeads = mockLeads.filter(lead => {
    const matchesSearch = searchTerm === "" || 
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.vehicleInterest.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    const hasAccess = user.role === "manager" || user.role === "admin" || 
      lead.salespersonId === user.id;
    
    return matchesSearch && matchesStatus && hasAccess;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "engaged": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const canEdit = (lead: any) => {
    return user.role === "manager" || user.role === "admin" || lead.salespersonId === user.id;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Leads</h1>
          <p className="text-slate-600 mt-1">
            {user.role === "sales" ? "Your assigned leads" : "All leads in the system"}
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="engaged">Engaged</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <Card key={lead.id} className="hover:shadow-lg transition-all duration-200 relative">
            {!canEdit(lead) && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  Owner-only
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {lead.firstName} {lead.lastName}
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                    {lead.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {lead.unreadCount} new
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {lead.aiOptIn && (
                    <Bot className="w-4 h-4 text-blue-500" title="AI enabled" />
                  )}
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{lead.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span>{lead.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Car className="w-4 h-4" />
                  <span>{lead.vehicleInterest}</span>
                </div>
              </div>

              {/* Last Message */}
              {lead.lastMessage && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-700">{lead.lastMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Info */}
              {lead.aiOptIn && lead.nextAiSendAt && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>Next AI follow-up: {new Date(lead.nextAiSendAt).toLocaleString()}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  disabled={!canEdit(lead)}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Message
                </Button>
                <Button 
                  size="sm" 
                  variant={lead.aiOptIn ? "destructive" : "default"} 
                  className="px-3"
                  disabled={!canEdit(lead)}
                >
                  <Bot className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No leads found</h3>
          <p className="text-slate-600">
            {searchTerm ? "Try adjusting your search criteria" : "No leads match the current filters"}
          </p>
        </div>
      )}
    </div>
  );
};

export default LeadsList;
