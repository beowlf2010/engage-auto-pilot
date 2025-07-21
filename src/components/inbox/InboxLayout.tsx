
// DISABLED: This layout is disabled to prevent subscription conflicts
// Use MobileSmartInbox (self-contained) instead

import React from 'react';

interface InboxLayoutProps {
  children?: React.ReactNode;
}

const InboxLayout: React.FC<InboxLayoutProps> = () => {
  console.log('🚫 [INBOX LAYOUT] This layout is disabled - use MobileSmartInbox instead');
  
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center">
        <div className="text-lg font-medium text-gray-700 mb-2">
          Inbox Layout Disabled
        </div>
        <div className="text-sm text-gray-500">
          This layout has been disabled to prevent conflicts. Please use the main Smart Inbox.
        </div>
      </div>
    </div>
  );
};

export default InboxLayout;
