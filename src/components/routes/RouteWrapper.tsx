import React, { Suspense } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SimpleLoading } from '@/components/ui/SimpleLoading';

interface RouteWrapperProps {
  children: React.ReactNode;
  LayoutComponent: React.ComponentType<{ children: React.ReactNode }>;
  protected?: boolean;
}

export const RouteWrapper: React.FC<RouteWrapperProps> = ({ 
  children, 
  LayoutComponent, 
  protected: isProtected = true 
}) => {
  const content = (
    <LayoutComponent>
      <Suspense fallback={<SimpleLoading message="Loading page..." />}>
        {children}
      </Suspense>
    </LayoutComponent>
  );

  return isProtected ? (
    <ProtectedRoute>
      {content}
    </ProtectedRoute>
  ) : content;
};