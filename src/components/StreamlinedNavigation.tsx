
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import BrandLogo from './navigation/BrandLogo';
import NavigationItem from './navigation/NavigationItem';
import { getNavigationItems } from './navigation/navigationConfig';

const StreamlinedNavigation = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  console.log('StreamlinedNavigation rendering, profile:', profile);

  if (!profile) {
    console.log('No profile found, not rendering navigation');
    return null;
  }

  const navItems = getNavigationItems(profile.role, navigate);
  console.log('Navigation items for role', profile.role, ':', navItems);

  return (
    <nav className="backdrop-blur bg-white/80 border-b border-slate-200 px-8 py-3 shadow-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <BrandLogo />
          <div className="h-8 w-px bg-slate-300 mx-2" /> {/* Divider */}
        </div>
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            console.log('Rendering navigation item:', item.label, 'path:', item.path);
            return (
              <NavigationItem key={item.path} item={item} />
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default StreamlinedNavigation;
