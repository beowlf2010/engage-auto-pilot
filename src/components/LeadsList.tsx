import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PhoneNumberDisplay from "./PhoneNumberDisplay";
import { useLeads } from "@/hooks/useLeads";
import { toggleFinnAI } from "@/services/finnAIService";
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MessageSquare,
  Bot,
  User,
  Car,
  Clock,
  Users,
  Loader2,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  ArrowRightLeft
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
  const [contactFilter, setContactFilter] = useState("all");
  const [togglingAI, setTogglingAI] = useState<Set<number>>(new Set());
  const { leads, loading, refetch } = useLeads();

  // Filter leads based on user role and search/status filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === "" || 
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.vehicleInterest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.primaryPhone.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    const matchesContactFilter = contactFilter === "all" || lead.contactStatus === contactFilter;
    
    const hasAccess = user.role === "manager" || user.role === "admin" || 
      lead.salespersonId === user.id;
    
    return matchesSearch && matchesStatus && matchesContactFilter && hasAccess;
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

  const getContactStatusBadge = (lead: any) => {
    switch (lead.contactStatus) {
      case 'no_contact':
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
            <AlertTriangle className="w-3 h-3 mr-1" />
            No Contact
          </Badge>
        );
      case 'contact_attempted':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
            <ArrowRightLeft className="w-3 h-3 mr-1" />
            Contact Attempted ({lead.outgoingCount})
          </Badge>
        );
      case 'response_received':
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            <MessageCircle className="w-3 h-3 mr-1" />
            Response Received ({lead.incomingCount})
          </Badge>
        );
      default:
        return null;
    }
  };

  const canEdit = (lead: any) => {
    return user.role === "manager" || user.role === "admin" || lead.salespersonId === user.id;
  };

  const handlePhoneSelect = (leadId: number, phoneNumber: string) => {
    console.log(`Switching lead ${leadId} to phone ${phoneNumber}`);
    // In real app, this would update the lead's primary phone
  };

  const handleFinnAIToggle = async (lead: any) => {
    if (!canEdit(lead)) return;
    
    setTogglingAI(prev => new Set(prev).add(lead.id));
    
    const result = await toggleFinnAI(lead.id, lead.aiOptIn);
    
    if (result.success) {
      // Refetch leads to get updated state
      await refetch();
    }
    
    setTogglingAI(prev => {
      const newSet = new Set(prev);
      newSet.delete(lead.id);
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

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
              placeholder="Search leads, names, phones..."
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
          <select
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
          >
            <option value="all">All Contact</option>
            <option value="no_contact">No Contact</option>
            <option value="contact_attempted">Contact Attempted</option>
            <option value="response_received">Response Received</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-slate-600">No Contact</p>
                <p className="text-2xl font-bold text-slate-800">
                  {filteredLeads.filter(lead => lead.contactStatus === 'no_contact').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-600">Contact Attempted</p>
                <p className="text-2xl font-bold text-slate-800">
                  {filteredLeads.filter(lead => lead.contactStatus === 'contact_attempted').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-slate-600">Response Received</p>
                <p className="text-2xl font-bold text-slate-800">
                  {filteredLeads.filter(lead => lead.contactStatus === 'response_received').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-slate-600">Total Leads</p>
                <p className="text-2xl font-bold text-slate-800">
                  {filteredLeads.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <Card key={lead.id} className="hover:shadow-lg transition-all duration-200 relative">
            {!canEdit(lead) && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  View-only
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {lead.firstName} {lead.lastName}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                    {getContactStatusBadge(lead)}
                    {lead.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {lead.unreadCount} new
                      </Badge>
                    )}
                    {lead.doNotCall && (
                      <Badge variant="outline" className="text-xs text-red-600">
                        Do Not Call
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {lead.aiOptIn && (
                    <div className="flex items-center space-x-1 text-blue-500">
                      <Bot className="w-4 h-4" />
                      <span className="text-xs font-medium">Finn</span>
                    </div>
                  )}
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Phone Numbers */}
              <div>
                <PhoneNumberDisplay 
                  phoneNumbers={lead.phoneNumbers}
                  primaryPhone={lead.primaryPhone}
                  onPhoneSelect={(phone) => handlePhoneSelect(lead.id, phone)}
                  compact={lead.phoneNumbers.length === 1}
                />
              </div>

              {/* Other Contact Info */}
              <div className="space-y-2">
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
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 line-clamp-2">{lead.lastMessage}</p>
                      <p className="text-xs text-slate-500 mt-1">{lead.lastMessageTime}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Info */}
              {lead.aiOptIn && lead.nextAiSendAt && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>Next Finn follow-up: {new Date(lead.nextAiSendAt).toLocaleString()}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  disabled={!canEdit(lead) || lead.doNotCall}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Message
                </Button>
                <Button 
                  size="sm" 
                  variant={lead.aiOptIn ? "destructive" : "default"} 
                  className="px-3"
                  disabled={!canEdit(lead) || togglingAI.has(lead.id)}
                  onClick={() => handleFinnAIToggle(lead)}
                >
                  {togglingAI.has(lead.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && !loading && (
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
