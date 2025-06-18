
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, X, MessageCircle } from 'lucide-react';
import { useGlobalUnreadCount } from '@/hooks/useGlobalUnreadCount';

const UnreadMessageBanner = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { unreadCount } = useGlobalUnreadCount();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show banner on inbox pages or when no unread messages
  const isInboxPage = location.pathname.includes('/inbox') || location.pathname.includes('/smart-inbox');
  const shouldShow = unreadCount > 0 && !isDismissed && !isInboxPage;

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

  if (!shouldShow) return null;

  return (
    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg animate-in slide-in-from-top-2 duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {unreadCount === 1 
                  ? 'You have 1 unread message' 
                  : `You have ${unreadCount} unread messages`
                }
              </span>
              <span className="text-red-100 text-sm">•</span>
              <span className="text-red-100 text-sm">Click to view now</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleViewMessages}
              variant="secondary"
              size="sm"
              className="bg-white text-red-600 hover:bg-red-50 font-medium"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              View Messages
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
