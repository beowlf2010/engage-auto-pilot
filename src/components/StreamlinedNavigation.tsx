
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import BrandLogo from './navigation/BrandLogo';
import NavigationItem from './navigation/NavigationItem';
import { getNavigationItems } from './navigation/navigationConfig';

const StreamlinedNavigation = () => {
  const { profile, loading, user } = useAuth();

  if (loading) {
    return (
      <nav className="backdrop-blur bg-white/80 border-b border-slate-200 px-8 py-3 shadow-md">
        <div className="flex items-center gap-6">
          <BrandLogo />
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </nav>
    );
  }

  if (!profile) {
    return (
      <nav className="backdrop-blur bg-white/80 border-b border-slate-200 px-8 py-3 shadow-md">
        <div className="flex items-center gap-6">
          <BrandLogo />
          <div className="text-sm text-red-500">Profile not loaded</div>
        </div>
      </nav>
    );
  }

  const navItems = getNavigationItems(profile.role);

  return (
    <nav className="backdrop-blur bg-white/80 border-b border-slate-200 px-8 py-3 shadow-md">
      <div className="flex items-center gap-6 w-full">
        <div className="flex items-center gap-4 flex-shrink-0">
          <BrandLogo />
          <div className="h-8 w-px bg-slate-300 mx-2" />
        </div>
        
        <div className="flex items-center gap-3 flex-1 overflow-x-auto">
          <div className="flex items-center gap-3 min-w-max">
            {navItems.map((item) => (
              <div key={item.path} className="flex-shrink-0">
                <NavigationItem item={item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StreamlinedNavigation;
