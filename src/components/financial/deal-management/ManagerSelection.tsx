import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, X } from "lucide-react";

interface Manager {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ManagerSelectionProps {
  dealId: string;
  assignedManagerIds: string[];
  onManagersUpdate: (dealId: string, managerIds: string[]) => void;
}

const ManagerSelection = ({ dealId, assignedManagerIds, onManagersUpdate }: ManagerSelectionProps) => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('role', ['manager', 'admin'])
        .order('first_name');

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManagerToggle = (managerId: string) => {
    const newManagerIds = assignedManagerIds.includes(managerId)
      ? assignedManagerIds.filter(id => id !== managerId)
      : [...assignedManagerIds, managerId];
    
    onManagersUpdate(dealId, newManagerIds);
  };

  const removeManager = (managerId: string) => {
    const newManagerIds = assignedManagerIds.filter(id => id !== managerId);
    onManagersUpdate(dealId, newManagerIds);
  };

  const getManagerName = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : 'Unknown';
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Display assigned managers */}
      <div className="flex flex-wrap gap-1">
        {assignedManagerIds.map(managerId => (
          <Badge 
            key={managerId} 
            variant="secondary" 
            className="text-xs flex items-center space-x-1"
          >
            <span>{getManagerName(managerId)}</span>
            <X 
              className="w-3 h-3 cursor-pointer hover:text-red-600" 
              onClick={() => removeManager(managerId)}
            />
          </Badge>
        ))}
      </div>

      {/* Manager selection popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
            <Users className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Assign Managers</h4>
            {loading ? (
              <div className="text-sm text-slate-500">Loading managers...</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {managers.map(manager => (
                  <div key={manager.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={assignedManagerIds.includes(manager.id)}
                      onCheckedChange={() => handleManagerToggle(manager.id)}
                    />
                    <span className="text-sm">
                      {manager.first_name} {manager.last_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ManagerSelection;