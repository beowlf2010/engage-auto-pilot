import React from 'react';
import { WifiOff, Server, Shield, AlertCircle } from 'lucide-react';

export type ErrorType = 'network' | 'server' | 'permission' | 'validation' | 'generic';

export interface ErrorConfig {
  icon: React.ReactElement;
  defaultTitle: string;
  defaultMessage: string;
  defaultAction: string;
}

export const getErrorConfig = (type: ErrorType): ErrorConfig => {
  switch (type) {
    case 'network':
      return {
        icon: React.createElement(WifiOff, { className: "h-8 w-8 text-red-500" }),
        defaultTitle: 'Connection Error',
        defaultMessage: 'Unable to connect to the server. Please check your internet connection.',
        defaultAction: 'Try Again'
      };
    case 'server':
      return {
        icon: React.createElement(Server, { className: "h-8 w-8 text-orange-500" }),
        defaultTitle: 'Server Error',
        defaultMessage: 'Something went wrong on our end. Please try again in a moment.',
        defaultAction: 'Retry'
      };
    case 'permission':
      return {
        icon: React.createElement(Shield, { className: "h-8 w-8 text-yellow-500" }),
        defaultTitle: 'Access Denied',
        defaultMessage: 'You don\'t have permission to view this content.',
        defaultAction: 'Go Back'
      };
    case 'validation':
      return {
        icon: React.createElement(AlertCircle, { className: "h-8 w-8 text-amber-500" }),
        defaultTitle: 'Invalid Data',
        defaultMessage: 'Please check your input and try again.',
        defaultAction: 'Fix Issues'
      };
    default:
      return {
        icon: React.createElement(AlertCircle, { className: "h-8 w-8 text-red-500" }),
        defaultTitle: 'Something went wrong',
        defaultMessage: 'An unexpected error occurred. Please try again.',
        defaultAction: 'Try Again'
      };
  }
};