
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import AdvancedAnalyticsDashboard from '@/components/ai-monitor/AdvancedAnalyticsDashboard';
import { Navigate } from 'react-router-dom';

const AIAnalyticsPage = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading AI analytics...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has permission to access AI analytics
  if (!['admin', 'manager'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdvancedAnalyticsDashboard />;
};

export default AIAnalyticsPage;
