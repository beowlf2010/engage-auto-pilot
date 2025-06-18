
import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRealtimeChannelManager } from './useRealtimeChannelManager';
import { useRealtimeNotificationHandlers } from './useRealtimeNotificationHandlers';
import type { RealtimeCallbacks } from '@/types/realtime';

export const useCentralizedRealtime = (callbacks: RealtimeCallbacks) => {
  const { profile } = useAuth();
  const callbacksRef = useRef(callbacks);
  const {
    addCallbacks,
    removeCallbacks,
    createChannel,
    cleanupChannel,
    getCallbacks
  } = useRealtimeChannelManager();

  const {
    handleIncomingMessage,
    handleIncomingEmail,
    requestNotificationPermission
  } = useRealtimeNotificationHandlers(getCallbacks());

  // Update callbacks ref when they change
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!profile) return;

    console.log('🔌 Setting up centralized realtime subscription');
    
    // Request notification permission
    requestNotificationPermission();

    // Add callbacks to global state
    addCallbacks(callbacks);

    // Create or get existing channel
    createChannel(profile, handleIncomingMessage, handleIncomingEmail);

    return () => {
      console.log('🔌 Cleaning up centralized realtime subscription');
      removeCallbacks(callbacks);
      cleanupChannel();
    };
  }, [profile, addCallbacks, removeCallbacks, createChannel, cleanupChannel, handleIncomingMessage, handleIncomingEmail, requestNotificationPermission]);

  // Update callbacks when they change
  useEffect(() => {
    const currentCallbacks = getCallbacks();
    const index = currentCallbacks.findIndex(cb => cb === callbacks);
    if (index > -1) {
      currentCallbacks[index] = callbacks;
    }
  }, [callbacks, getCallbacks]);
};
