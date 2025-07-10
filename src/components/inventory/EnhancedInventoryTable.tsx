import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  MoreHorizontal,
  Star,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InventoryItem } from '@/services/inventory/types';

interface EnhancedInventoryTableProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  selectedVehicles: InventoryItem[];
  onSort: (field: string) => void;
  onSelectVehicle: (vehicle: InventoryItem, selected: boolean) => void;
  onSelectAll: () => void;
  onVehicleAction: (action: string, vehicle: InventoryItem) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const EnhancedInventoryTable = ({ 
  inventory, 
  isLoading, 
  selectedVehicles,
  onSort, 
  onSelectVehicle,
  onSelectAll,
  onVehicleAction,
  sortBy,
  sortOrder
}: EnhancedInventoryTableProps) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const isSelected = (vehicle: InventoryItem) => 
    selectedVehicles.some(v => v.id === vehicle.id);

  const isAllSelected = useMemo(() => 
    inventory.length > 0 && inventory.every(vehicle => isSelected(vehicle)),
    [inventory, selectedVehicles]
  );

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon?: any }> = {
      available: { variant: 'default', icon: CheckCircle },
      sold: { variant: 'secondary' },
      pending: { variant: 'outline', icon: Clock },
      service: { variant: 'destructive', icon: AlertTriangle },
      wholesale: { variant: 'outline' }
    };
    
    const config = variants[status] || { variant: 'outline' };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {status}
      </Badge>
    );
  };

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      new: 'default',
      used: 'secondary',
      certified: 'outline'
    };
    
    return (
      <Badge variant={variants[condition] || 'outline'}>
        {condition}
      </Badge>
    );
  };

  const getDataCompletenessColor = (completeness: number) => {
    if (completeness >= 80) return 'bg-green-500';
    if (completeness >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAgingIndicator = (days: number) => {
    if (days > 90) return { color: 'text-red-600', icon: TrendingDown };
    if (days > 60) return { color: 'text-yellow-600', icon: Clock };
    if (days > 30) return { color: 'text-blue-600', icon: TrendingUp };
    return { color: 'text-green-600', icon: Star };
  };

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button 
      variant="ghost" 
      onClick={() => onSort(field)} 
      className="h-auto p-0 font-semibold hover:bg-transparent"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === field && (
          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </div>
    </Button>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Inventory 
            <Badge variant="secondary">{inventory.length} vehicles</Badge>
            {selectedVehicles.length > 0 && (
              <Badge variant="default">{selectedVehicles.length} selected</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <SortButton field="stock_number">Stock #</SortButton>
                </TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <SortButton field="price">Price</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="age">Age</SortButton>
                </TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((vehicle) => {
                const aging = getAgingIndicator(vehicle.days_in_inventory || 0);
                const AgingIcon = aging.icon;
                
                return (
                  <TableRow 
                    key={vehicle.id}
                    className={`transition-colors ${isSelected(vehicle) ? 'bg-primary/5' : ''} ${hoveredRow === vehicle.id ? 'bg-muted/50' : ''}`}
                    onMouseEnter={() => setHoveredRow(vehicle.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected(vehicle)}
                        onCheckedChange={(checked) => onSelectVehicle(vehicle, !!checked)}
                      />
                    </TableCell>
                    
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {vehicle.make?.charAt(0)}{vehicle.model?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{vehicle.stock_number || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{vehicle.vin?.slice(-6)}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.trim && `${vehicle.trim} • `}
                          {vehicle.body_style}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vehicle.color_exterior}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getConditionBadge(vehicle.condition)}
                          {vehicle.mileage && (
                            <Badge variant="outline" className="text-xs">
                              {vehicle.mileage.toLocaleString()} mi
                            </Badge>
                          )}
                        </div>
                        {vehicle.source_report && (
                          <div className="text-xs text-muted-foreground">
                            Source: {vehicle.source_report.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(vehicle.status)}
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatPrice(vehicle.price)}</div>
                        {vehicle.msrp && vehicle.price && vehicle.msrp !== vehicle.price && (
                          <div className="text-xs text-muted-foreground">
                            MSRP: {formatPrice(vehicle.msrp)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AgingIcon className={`h-4 w-4 ${aging.color}`} />
                        <div>
                          <div className="font-medium">{vehicle.days_in_inventory || 0}</div>
                          <div className="text-xs text-muted-foreground">days</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => onVehicleAction('view_leads', vehicle)}
                            >
                              <Users className="h-3 w-3" />
                              {vehicle.leads_count || 0}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View leads for this vehicle</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={vehicle.data_completeness || 0} 
                                className="w-12 h-2"
                              />
                              <span className="text-xs font-medium">
                                {Math.round(vehicle.data_completeness || 0)}%
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data completeness: {Math.round(vehicle.data_completeness || 0)}%</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onVehicleAction('view_detail', vehicle)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onVehicleAction('edit', vehicle)}>
                            Edit Vehicle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onVehicleAction('view_leads', vehicle)}>
                            <Users className="h-4 w-4 mr-2" />
                            View Leads ({vehicle.leads_count || 0})
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onVehicleAction('add_to_marketing', vehicle)}>
                            Add to Marketing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onVehicleAction('price_analysis', vehicle)}>
                            Price Analysis
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedInventoryTable;