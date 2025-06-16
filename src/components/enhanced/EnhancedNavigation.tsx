
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/glass-card';
import { getNavigationItems } from '@/components/navigation/navigationConfig';
import { getGlassColorClasses } from '@/components/navigation/glassNavigationStyles';
import { cn } from '@/lib/utils';
import { Menu, X, Bell, Search, Settings } from 'lucide-react';

const EnhancedNavigation = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!profile) return null;

  const navItems = getNavigationItems(profile.role, navigate);

  return (
    <nav className="relative z-50">
      {/* Main Navigation Bar */}
      <GlassCard opacity="high" blur="xl" className="px-6 py-4 m-4 rounded-2xl">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div 
            className="flex items-center space-x-4 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AUTO-TEXT CRM
              </h1>
              <p className="text-xs text-gray-500">AI-Powered Dealership</p>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const itemColor = item.color || 'blue';
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300",
                    getGlassColorClasses(itemColor, isActive)
                  )}
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex p-3 rounded-xl hover:bg-white/20 hover:scale-105 transition-all duration-300"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative p-3 rounded-xl hover:bg-white/20 hover:scale-105 transition-all duration-300"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-pulse"></span>
            </Button>

            {/* User Profile */}
            <div className="hidden md:flex items-center space-x-3 pl-3 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{profile.first_name} {profile.last_name}</p>
                <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-3 rounded-xl hover:bg-white/20"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200/50">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const itemColor = item.color || 'blue';
                
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full justify-start flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300",
                      getGlassColorClasses(itemColor, isActive)
                    )}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Mobile User Section */}
            <div className="mt-4 pt-4 border-t border-gray-200/50 flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium text-gray-800">{profile.first_name} {profile.last_name}</p>
                <p className="text-sm text-gray-500 capitalize">{profile.role}</p>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </nav>
  );
};

export default EnhancedNavigation;
