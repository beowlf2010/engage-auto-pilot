import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface DashboardWidget {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: any;
  size: 'small' | 'medium' | 'large' | 'full';
  visible: boolean;
  category: 'stats' | 'actions' | 'insights' | 'activity';
}

interface SortableWidgetProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onToggleVisibility: (widgetId: string) => void;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ 
  widget, 
  isEditing, 
  onToggleVisibility 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getSizeClasses = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1';
      case 'medium':
        return 'col-span-2 row-span-1';
      case 'large':
        return 'col-span-2 row-span-2';
      case 'full':
        return 'col-span-4 row-span-1';
      default:
        return 'col-span-1 row-span-1';
    }
  };

  if (!widget.visible && !isEditing) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${getSizeClasses(widget.size)}
        ${isDragging ? 'z-50 opacity-75' : ''}
        ${isEditing ? 'ring-2 ring-primary/20 ring-offset-2' : ''}
        ${!widget.visible ? 'opacity-50' : ''}
        transition-all duration-200
      `}
    >
      <div className="relative h-full">
        {/* Edit Controls */}
        {isEditing && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleVisibility(widget.id)}
              className="h-6 w-6 p-0"
            >
              {widget.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Widget Content */}
        <div className={`h-full ${!widget.visible && isEditing ? 'opacity-30' : ''}`}>
          <widget.component {...(widget.props || {})} />
        </div>

        {/* Hidden Badge */}
        {!widget.visible && isEditing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Badge variant="secondary">Hidden</Badge>
          </div>
        )}
      </div>
    </div>
  );
};

interface DraggableDashboardProps {
  widgets: DashboardWidget[];
  onLayoutChange: (widgets: DashboardWidget[]) => void;
}

export const DraggableDashboard: React.FC<DraggableDashboardProps> = ({
  widgets,
  onLayoutChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync with prop changes
  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localWidgets.findIndex((widget) => widget.id === active.id);
      const newIndex = localWidgets.findIndex((widget) => widget.id === over.id);

      const newWidgets = arrayMove(localWidgets, oldIndex, newIndex);
      setLocalWidgets(newWidgets);
      onLayoutChange(newWidgets);
    }
  }, [localWidgets, onLayoutChange]);

  const handleToggleVisibility = useCallback((widgetId: string) => {
    const newWidgets = localWidgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, visible: !widget.visible }
        : widget
    );
    setLocalWidgets(newWidgets);
    onLayoutChange(newWidgets);
  }, [localWidgets, onLayoutChange]);

  const handleResetLayout = useCallback(() => {
    // Reset to default order and make all visible
    const resetWidgets = [...widgets].map(widget => ({ ...widget, visible: true }));
    setLocalWidgets(resetWidgets);
    onLayoutChange(resetWidgets);
  }, [widgets, onLayoutChange]);

  const toggleEditMode = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing]);

  const visibleWidgetIds = localWidgets.filter(w => w.visible || isEditing).map(w => w.id);
  const hiddenCount = localWidgets.filter(w => !w.visible).length;

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          {hiddenCount > 0 && (
            <Badge variant="secondary">
              {hiddenCount} widget{hiddenCount !== 1 ? 's' : ''} hidden
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Widget Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dashboard Widget Settings</DialogTitle>
                <DialogDescription>
                  Customize which widgets are visible on your dashboard
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {Object.entries(
                  localWidgets.reduce((groups, widget) => {
                    const category = widget.category || 'other';
                    if (!groups[category]) groups[category] = [];
                    groups[category].push(widget);
                    return groups;
                  }, {} as Record<string, DashboardWidget[]>)
                ).map(([category, categoryWidgets]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium capitalize">{category}</h4>
                    <div className="space-y-2">
                      {categoryWidgets.map(widget => (
                        <div key={widget.id} className="flex items-center justify-between">
                          <span className="text-sm">{widget.title}</span>
                          <Switch
                            checked={widget.visible}
                            onCheckedChange={() => handleToggleVisibility(widget.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Layout
          </Button>
          
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={toggleEditMode}
          >
            <GripVertical className="h-4 w-4 mr-2" />
            {isEditing ? 'Done Editing' : 'Edit Layout'}
          </Button>
        </div>
      </div>

      {/* Edit Mode Instructions */}
      {isEditing && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <GripVertical className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">Edit Mode Active</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Drag widgets to reorder them. Use the eye icon to show/hide widgets. 
            Hidden widgets are shown with reduced opacity.
          </p>
        </div>
      )}

      {/* Dashboard Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgetIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-6 auto-rows-fr">
            {localWidgets
              .filter(widget => widget.visible || isEditing)
              .map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  isEditing={isEditing}
                  onToggleVisibility={handleToggleVisibility}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {localWidgets.filter(w => w.visible).length === 0 && !isEditing && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <GripVertical className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No widgets are currently visible</p>
            <p className="text-sm">Click "Edit Layout" to show widgets</p>
          </div>
          <Button onClick={toggleEditMode}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Layout
          </Button>
        </div>
      )}
    </div>
  );
};