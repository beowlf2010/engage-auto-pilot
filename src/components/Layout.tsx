
import React from 'react';
import StreamlinedNavigation from '@/components/StreamlinedNavigation';
import ErrorBoundary from '@/components/ErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  console.log('Layout component rendering...');
  
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex flex-col overflow-hidden">
          <StreamlinedNavigation />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Layout;
