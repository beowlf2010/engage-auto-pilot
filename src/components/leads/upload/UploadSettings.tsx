
import React from 'react';

interface UploadSettingsProps {
  updateExistingLeads: boolean;
  onUpdateExistingLeadsChange: (value: boolean) => void;
  disabled: boolean;
}

const UploadSettings = ({ updateExistingLeads, onUpdateExistingLeadsChange, disabled }: UploadSettingsProps) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="updateExistingLeads"
          checked={updateExistingLeads}
          onChange={(e) => onUpdateExistingLeadsChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="updateExistingLeads" className="text-sm font-medium text-blue-900">
          Update existing leads with new information
        </label>
      </div>
      <p className="text-xs text-blue-700 mt-2 ml-7">
        When enabled, leads that match existing records (by phone, email, or name) will be updated with any missing information from the upload, rather than being skipped as duplicates.
      </p>
    </div>
  );
};

export default UploadSettings;
