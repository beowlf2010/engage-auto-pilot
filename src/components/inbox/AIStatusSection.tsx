
import React from 'react';

interface AIStatusSectionProps {
  conversation: any;
}

const AIStatusSection: React.FC<AIStatusSectionProps> = ({ conversation }) => {
  if (!conversation.aiOptIn) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700">AI Status</h4>
      <div className="bg-purple-50 p-3 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span className="text-sm font-medium text-purple-800">Finn AI Active</span>
        </div>
        <p className="text-xs text-purple-600">
          AI assistant is helping with this lead
        </p>
      </div>
    </div>
  );
};

export default AIStatusSection;
