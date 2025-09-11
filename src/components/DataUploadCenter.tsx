import React from 'react';
import LeadUploadCenter from './LeadUploadCenter';

interface DataUploadCenterProps {
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

const DataUploadCenter = ({ user }: DataUploadCenterProps) => {
  return <LeadUploadCenter user={user} />;
};

export default DataUploadCenter;