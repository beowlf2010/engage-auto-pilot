
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  console.log('ProtectedRoute: Component rendering...');
  
  try {
    const { user, loading, profile } = useAuth();

    console.log('ProtectedRoute: Auth state check:', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      loading 
    });

    if (loading) {
      console.log('ProtectedRoute: Still loading, showing spinner');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (!user) {
      console.log('ProtectedRoute: No user found, redirecting to auth');
      return <Navigate to="/auth" replace />;
    }

    console.log('ProtectedRoute: User authenticated, rendering children');
    return <>{children}</>;
  } catch (error) {
    console.error('ProtectedRoute: Error accessing auth context:', error);
    return <Navigate to="/auth" replace />;
  }
};

export default ProtectedRoute;
