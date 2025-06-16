
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BrandLogo from './navigation/BrandLogo';
import NavigationItem from './navigation/NavigationItem';
import { getNavigationItems } from './navigation/navigationConfig';
import { ChevronDown, User, LogOut } from 'lucide-react';

const StreamlinedNavigation = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) return null;

  const allNavItems = getNavigationItems(profile.role, navigate);
  const primaryItems = allNavItems.filter(item => item.priority === 'primary');
  const secondaryItems = allNavItems.filter(item => item.priority === 'secondary');

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <nav className="backdrop-blur bg-white/80 border-b border-slate-200 px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and primary navigation */}
        <div className="flex items-center gap-6">
          <BrandLogo />
          <div className="h-6 w-px bg-slate-300" />
          <div className="flex items-center gap-1">
            {primaryItems.map((item) => (
              <NavigationItem key={item.path} item={item} />
            ))}
          </div>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-slate-800">
                    {profile.first_name} {profile.last_name}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">
                    {profile.role}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default StreamlinedNavigation;
