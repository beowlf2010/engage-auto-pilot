
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, X, MessageCircle, RefreshCw } from 'lucide-react';
import { useGlobalUnreadCount } from '@/hooks/useGlobalUnreadCount';

const UnreadMessageBanner = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { unreadCount, refreshUnreadCount } = useGlobalUnreadCount();
  const navigate = useNavigate();
  const location = useLocation();

  // Debug logs
  console.log('🔴 [UNREAD BANNER] Component rendering - unreadCount:', unreadCount, 'isDismissed:', isDismissed, 'currentPath:', location.pathname);

  // Don't show banner on inbox pages, dashboard, or when no unread messages
  const isInboxPage = location.pathname.includes('/inbox') || 
                     location.pathname.includes('/smart-inbox') || 
                     location.pathname === '/dashboard';
  const shouldShow = unreadCount > 0 && !isDismissed && !isInboxPage;

  console.log('🔴 [UNREAD BANNER] shouldShow:', shouldShow, 'isInboxPage:', isInboxPage);

  // Reset dismissal when unread count changes
  useEffect(() => {
    if (unreadCount > 0) {
      setIsDismissed(false);
    }
  }, [unreadCount]);

  const handleViewMessages = () => {
    navigate('/smart-inbox');
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    console.log('🔄 [UNREAD BANNER] Manual refresh triggered');
    try {
      await refreshUnreadCount();
    } catch (error) {
      console.error('❌ [UNREAD BANNER] Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg animate-in slide-in-from-top-2 duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between min-h-[48px]">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold">
                {unreadCount === 1 
                  ? 'You have 1 unread message' 
                  : `You have ${unreadCount} unread messages`
                }
              </span>
              <span className="text-red-100 text-sm hidden sm:inline">•</span>
              <span className="text-red-100 text-sm hidden sm:inline">Click to view now</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleManualRefresh}
              variant="ghost"
              size="sm"
              disabled={isRefreshing}
              className="text-white hover:bg-white/10"
              title="Refresh unread count"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleViewMessages}
              variant="secondary"
              size="sm"
              className="bg-white text-red-600 hover:bg-red-50 font-medium"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">View Messages</span>
              <span className="sm:hidden">View</span>
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnreadMessageBanner;
