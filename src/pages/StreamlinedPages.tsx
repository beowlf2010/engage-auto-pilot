
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import UnifiedSmartInbox from '@/components/inbox/UnifiedSmartInbox';
import { SalesDashboard, ManagerDashboard } from '@/components/StreamlinedDashboards';
import LeadsList from '@/components/LeadsList';
import AIMessageMonitor from '@/components/AIMessageMonitor';
import FinancialDashboard from '@/components/financial/FinancialDashboard';
import InventoryDashboard from '@/components/InventoryDashboard';
import InventoryUpload from '@/components/InventoryUpload';
import RPOInsights from '@/components/RPOInsights';

export const SmartInboxPage = () => {
  const { profile } = useAuth();
  
  if (!profile) {
    return <div>Please sign in to access the Smart Inbox</div>;
  }

  return (
    <UnifiedSmartInbox 
      user={{
        id: profile.id,
        role: profile.role
      }}
    />
  );
};

export const SalesDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile || profile.role !== 'sales') {
    return <div>Access denied. Sales role required.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Sales Dashboard</h1>
        <p className="text-slate-600">Your personal performance metrics</p>
      </div>
      <SalesDashboard />
    </div>
  );
};

export const ManagerDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return <div>Access denied. Manager or Admin role required.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Manager Dashboard</h1>
        <p className="text-slate-600">Team performance overview</p>
      </div>
      <ManagerDashboard />
    </div>
  );
};

export const AdminDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile || profile.role !== 'admin') {
    return <div>Access denied. Admin role required.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-600">Complete system overview</p>
      </div>
      <ManagerDashboard />
    </div>
  );
};

export const FinancialDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Manager or Admin role required to access financial data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <FinancialDashboard 
        user={{
          id: profile.id,
          email: profile.email || '',
          role: profile.role,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          phone: profile.phone || undefined
        }}
      />
    </div>
  );
};

export const StreamlinedLeadsPage = () => {
  const { profile } = useAuth();
  
  if (!profile) {
    return <div>Please sign in to access leads</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <LeadsList />
    </div>
  );
};

export const AIMonitorPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Manager or Admin role required to access AI monitoring.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">AI Message Monitor</h1>
        <p className="text-slate-600">Monitor and control your AI messaging system</p>
      </div>
      <AIMessageMonitor />
    </div>
  );
};

export const InventoryDashboardPage = () => {
  const { profile } = useAuth();
  
  if (!profile) {
    return <div>Please sign in to access inventory</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <InventoryDashboard />
    </div>
  );
};

export const InventoryUploadPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Manager or Admin role required to upload inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <InventoryUpload user={{ id: profile.id, role: profile.role }} />
    </div>
  );
};

export const RPOInsightsPage = () => {
  const { profile } = useAuth();
  
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">Manager or Admin role required to access RPO insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <RPOInsights />
    </div>
  );
};

// Default export for compatibility with existing imports
const StreamlinedPages = {
  SmartInboxPage,
  SalesDashboardPage,
  ManagerDashboardPage,
  AdminDashboardPage,
  FinancialDashboardPage,
  StreamlinedLeadsPage,
  AIMonitorPage,
  InventoryDashboardPage,
  InventoryUploadPage,
  RPOInsightsPage
};

export default StreamlinedPages;
