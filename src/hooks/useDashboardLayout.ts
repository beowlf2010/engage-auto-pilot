import { useState, useEffect, useCallback } from 'react';
import { DashboardWidget } from '@/components/dashboard/DraggableDashboard';

interface DashboardLayout {
  widgets: DashboardWidget[];
  lastModified: string;
  version: number;
}

const STORAGE_KEY = 'dashboard-layout';
const LAYOUT_VERSION = 1;

export const useDashboardLayout = (defaultWidgets: DashboardWidget[]) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [isLoading, setIsLoading] = useState(true);

  // Load layout from localStorage
  const loadLayout = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const layout: DashboardLayout = JSON.parse(stored);
        
        // Check version compatibility
        if (layout.version === LAYOUT_VERSION) {
          // Merge with default widgets to handle new widgets
          const mergedWidgets = mergeWidgets(defaultWidgets, layout.widgets);
          setWidgets(mergedWidgets);
        } else {
          // Version mismatch, use defaults
          setWidgets(defaultWidgets);
        }
      } else {
        setWidgets(defaultWidgets);
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
      setWidgets(defaultWidgets);
    } finally {
      setIsLoading(false);
    }
  }, [defaultWidgets]);

  // Save layout to localStorage
  const saveLayout = useCallback((newWidgets: DashboardWidget[]) => {
    const layout: DashboardLayout = {
      widgets: newWidgets,
      lastModified: new Date().toISOString(),
      version: LAYOUT_VERSION,
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      setWidgets(newWidgets);
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
    }
  }, []);

  // Merge stored widgets with default widgets (for handling new widgets)
  const mergeWidgets = useCallback((defaultWidgets: DashboardWidget[], storedWidgets: DashboardWidget[]) => {
    const storedMap = new Map(storedWidgets.map(w => [w.id, w]));
    const merged: DashboardWidget[] = [];
    
    // Add stored widgets in their saved order
    storedWidgets.forEach(storedWidget => {
      const defaultWidget = defaultWidgets.find(w => w.id === storedWidget.id);
      if (defaultWidget) {
        // Merge stored settings with default component/props
        merged.push({
          ...defaultWidget,
          visible: storedWidget.visible,
          size: storedWidget.size,
        });
      }
    });
    
    // Add any new default widgets that weren't in storage
    defaultWidgets.forEach(defaultWidget => {
      if (!storedMap.has(defaultWidget.id)) {
        merged.push(defaultWidget);
      }
    });
    
    return merged;
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    const resetWidgets = defaultWidgets.map(widget => ({ ...widget, visible: true }));
    saveLayout(resetWidgets);
  }, [defaultWidgets, saveLayout]);

  // Export layout for sharing/backup
  const exportLayout = useCallback(() => {
    const layout: DashboardLayout = {
      widgets,
      lastModified: new Date().toISOString(),
      version: LAYOUT_VERSION,
    };
    
    const dataStr = JSON.stringify(layout, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-layout-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [widgets]);

  // Import layout from file
  const importLayout = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const layout: DashboardLayout = JSON.parse(e.target?.result as string);
          
          if (layout.version === LAYOUT_VERSION && layout.widgets) {
            const mergedWidgets = mergeWidgets(defaultWidgets, layout.widgets);
            saveLayout(mergedWidgets);
            resolve();
          } else {
            reject(new Error('Invalid layout file format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, [defaultWidgets, mergeWidgets, saveLayout]);

  // Load layout on mount
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  return {
    widgets,
    isLoading,
    saveLayout,
    resetLayout,
    exportLayout,
    importLayout,
  };
};