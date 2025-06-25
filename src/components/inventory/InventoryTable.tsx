
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryItem } from '@/services/inventory/types';

interface InventoryTableProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  onSort: (field: string) => void;
}

const InventoryTable = ({ inventory, isLoading, onSort }: InventoryTableProps) => {
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
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      available: 'default',
      sold: 'secondary',
      pending: 'outline',
      service: 'destructive',
      wholesale: 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
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
        <CardTitle>Inventory ({inventory.length} vehicles)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('stock_number')} className="h-auto p-0 font-semibold">
                    Stock #
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('year')} className="h-auto p-0 font-semibold">
                    Year
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('make')} className="h-auto p-0 font-semibold">
                    Make
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('model')} className="h-auto p-0 font-semibold">
                    Model
                  </Button>
                </TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('price')} className="h-auto p-0 font-semibold">
                    Price
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('age')} className="h-auto p-0 font-semibold">
                    Days in Inventory
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    {vehicle.stock_number || 'N/A'}
                  </TableCell>
                  <TableCell>{vehicle.year || 'N/A'}</TableCell>
                  <TableCell>{vehicle.make}</TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell>{getConditionBadge(vehicle.condition)}</TableCell>
                  <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                  <TableCell>{formatPrice(vehicle.price)}</TableCell>
                  <TableCell>{vehicle.days_in_inventory || 0} days</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryTable;
