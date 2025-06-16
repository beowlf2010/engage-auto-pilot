
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import BrandLogo from './navigation/BrandLogo';
import NavigationItem from './navigation/NavigationItem';
import { getNavigationItems } from './navigation/navigationConfig';

const StreamlinedNavigation = () => {
  const { profile, loading, user } = useAuth();

  console.log('StreamlinedNavigation rendering, auth state:', { 
    profile: !!profile, 
    loading, 
    user: !!user,
    profileRole: profile?.role 
  });

  if (loading) {
    console.log('StreamlinedNavigation: Auth still loading, not rendering');
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
    console.log('StreamlinedNavigation: No profile found, not rendering navigation items');
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
  console.log('StreamlinedNavigation: Navigation items for role', profile.role, ':', navItems);

  return (
    <nav className="backdrop-blur bg-white/80 border-b border-slate-200 px-8 py-3 shadow-md">
      <div className="flex items-center gap-6 w-full">
        <div className="flex items-center gap-4 flex-shrink-0">
          <BrandLogo />
          <div className="h-8 w-px bg-slate-300 mx-2" />
          <div className="text-xs text-gray-500">Role: {profile.role}</div>
        </div>
        
        <div className="flex items-center gap-3 flex-1 overflow-x-auto">
          <div className="flex items-center gap-3 min-w-max">
            {navItems.map((item) => {
              console.log('StreamlinedNavigation: Rendering navigation item:', item.label, 'path:', item.path);
              return (
                <div key={item.path} className="flex-shrink-0 min-w-[120px]">
                  <NavigationItem item={item} />
                </div>
              );
            })}
          </div>
          
          <div className="text-xs text-gray-400 ml-4 flex-shrink-0">
            Items: {navItems.length}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StreamlinedNavigation;
