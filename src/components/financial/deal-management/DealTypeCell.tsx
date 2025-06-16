
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";

interface Deal {
  id: string;
  deal_type?: string;
  deal_type_locked?: boolean;
}

interface DealTypeCellProps {
  deal: Deal;
  onDealTypeUpdate: (dealId: string, newType: string, forceUnlock?: boolean) => void;
  onUnlockDeal: (dealId: string) => void;
}

const DealTypeCell = ({ deal, onDealTypeUpdate, onUnlockDeal }: DealTypeCellProps) => {
  const getDealTypeColor = (dealType?: string) => {
    switch (dealType?.toLowerCase()) {
      case 'retail': return 'bg-green-100 text-green-800';
      case 'wholesale': return 'bg-blue-100 text-blue-800';
      case 'dealer_trade': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {deal.deal_type_locked ? (
        <div className="flex items-center space-x-2">
          <Badge className={`${getDealTypeColor(deal.deal_type)} flex items-center space-x-1`}>
            <Lock className="w-3 h-3" />
            <span>{deal.deal_type?.replace('_', ' ') || 'used'}</span>
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUnlockDeal(deal.id)}
            className="h-6 px-2"
          >
            <Unlock className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Select
          value={deal.deal_type || 'retail'}
          onValueChange={(value) => onDealTypeUpdate(deal.id, value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="wholesale">Wholesale</SelectItem>
            <SelectItem value="dealer_trade">Dealer Trade</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default DealTypeCell;
