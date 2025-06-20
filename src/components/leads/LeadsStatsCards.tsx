
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, UserCheck, UserX, Clock } from "lucide-react";

interface LeadsStatsCardsProps {
  stats: {
    total: number;
    noContact: number;
    contacted: number;
    responded: number;
    aiEnabled: number;
    fresh: number;
  };
  onCardClick?: (filterType: 'fresh' | 'all' | 'no_contact' | 'contact_attempted' | 'response_received' | 'ai_enabled') => void;
  activeFilter?: string;
}

const LeadsStatsCards: React.FC<LeadsStatsCardsProps> = ({ 
  stats, 
  onCardClick,
  activeFilter 
}) => (
  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
    <Card 
      className={`bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${
        activeFilter === 'fresh' ? 'ring-2 ring-green-400 shadow-lg' : ''
      }`}
      onClick={() => onCardClick?.('fresh')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-green-700">Fresh Today</CardTitle>
        <Clock className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-700">{stats.fresh}</div>
      </CardContent>
    </Card>
    
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${
        activeFilter === 'all' ? 'ring-2 ring-blue-400 shadow-lg' : ''
      }`}
      onClick={() => onCardClick?.('all')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.total}</div>
      </CardContent>
    </Card>
    
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${
        activeFilter === 'no_contact' ? 'ring-2 ring-blue-400 shadow-lg' : ''
      }`}
      onClick={() => onCardClick?.('no_contact')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">No Contact</CardTitle>
        <UserX className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.noContact}</div>
      </CardContent>
    </Card>
    
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${
        activeFilter === 'contact_attempted' ? 'ring-2 ring-blue-400 shadow-lg' : ''
      }`}
      onClick={() => onCardClick?.('contact_attempted')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Contacted</CardTitle>
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.contacted}</div>
      </CardContent>
    </Card>
    
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${
        activeFilter === 'response_received' ? 'ring-2 ring-blue-400 shadow-lg' : ''
      }`}
      onClick={() => onCardClick?.('response_received')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Responded</CardTitle>
        <UserCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.responded}</div>
      </CardContent>
    </Card>
    
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 ${
        activeFilter === 'ai_enabled' ? 'ring-2 ring-blue-400 shadow-lg' : ''
      }`}
      onClick={() => onCardClick?.('ai_enabled')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Finn AI Enabled</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.aiEnabled}</div>
      </CardContent>
    </Card>
  </div>
);

export default LeadsStatsCards;
