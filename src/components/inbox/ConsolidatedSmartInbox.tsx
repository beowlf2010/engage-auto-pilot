
// DISABLED: This component is disabled to prevent subscription conflicts
// Use MobileSmartInbox instead

import React from 'react';

const ConsolidatedSmartInbox = () => {
  console.log('🚫 [CONSOLIDATED SMART INBOX] This component is disabled - use MobileSmartInbox instead');
  
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center">
        <div className="text-lg font-medium text-gray-700 mb-2">
          Consolidated Smart Inbox Disabled
        </div>
        <div className="text-sm text-gray-500">
          This component has been disabled to prevent conflicts. Please use the main Smart Inbox.
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedSmartInbox;
