import React, { Suspense } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SimpleLoading } from '@/components/ui/SimpleLoading';
import { RouteErrorBoundary } from '@/components/error/RouteErrorBoundary';

interface RouteWrapperProps {
  children: React.ReactNode;
  LayoutComponent: React.ComponentType<{ children: React.ReactNode }>;
  protected?: boolean;
  routeName?: string;
}

export const RouteWrapper: React.FC<RouteWrapperProps> = ({ 
  children, 
  LayoutComponent, 
  protected: isProtected = true,
  routeName
}) => {
  const content = (
    <LayoutComponent>
      <RouteErrorBoundary routeName={routeName}>
        <Suspense fallback={<SimpleLoading message="Loading page..." />}>
          {children}
        </Suspense>
      </RouteErrorBoundary>
    </LayoutComponent>
  );

  return isProtected ? (
    <ProtectedRoute>
      {content}
    </ProtectedRoute>
  ) : content;
};