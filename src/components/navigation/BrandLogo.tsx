
import React from 'react';
import { useNavigate } from 'react-router-dom';

const BrandLogo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mr-8 cursor-pointer"
      onClick={() => navigate('/')}
    >
      AUTO-TEXT CRM
    </div>
  );
};

export default BrandLogo;
