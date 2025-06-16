
import React from 'react';
import { Activity, Globe, Eye, Mouse, AlertTriangle, CheckCircle } from 'lucide-react';

export const getTriggerIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    website_visit: Globe,
    email_open: Eye,
    link_click: Mouse,
    page_view: Activity,
    search_activity: Activity,
    price_alert: AlertTriangle,
    inventory_match: CheckCircle
  };

  const Icon = iconMap[type] || Activity;
  return <Icon className="h-4 w-4" />;
};

export const getUrgencyColor = (urgency: string): "default" | "secondary" | "destructive" | "outline" => {
  const colorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    low: 'default',
    medium: 'secondary',
    high: 'destructive',
    critical: 'destructive'
  };
  return colorMap[urgency] || 'default';
};

export const formatTriggerData = (type: string, data: any) => {
  try {
    switch (type) {
      case 'website_visit':
        return `${data.page_type} - ${data.time_spent}s`;
      case 'email_open':
        return `${data.engagement_type} engagement`;
      case 'price_alert':
        return `Price change: $${data.old_price} → $${data.new_price}`;
      default:
        return 'Activity detected';
    }
  } catch {
    return 'Activity detected';
  }
};
