
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import BrandLogo from './navigation/BrandLogo';
import NavigationItem from './navigation/NavigationItem';
import { getNavigationItems } from './navigation/navigationConfig';

const StreamlinedNavigation = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const navItems = getNavigationItems(profile.role, navigate);

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
      <div className="flex items-center space-x-2">
        <BrandLogo />
        {navItems.map((item) => (
          <NavigationItem key={item.path} item={item} />
        ))}
      </div>
    </nav>
  );
};

export default StreamlinedNavigation;
