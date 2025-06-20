
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserX } from 'lucide-react';

interface MarkLostConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  leadCount: number;
  leadName?: string;
}

const MarkLostConfirmDialog: React.FC<MarkLostConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  leadCount,
  leadName
}) => {
  const isMultiple = leadCount > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <UserX className="w-5 h-5 text-red-500" />
            <span>Mark {isMultiple ? 'Leads' : 'Lead'} as Lost</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to mark {isMultiple ? `${leadCount} leads` : leadName || 'this lead'} as lost?
            </p>
            <p className="text-sm text-gray-600">
              This will:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
              <li>Set the lead status to "Lost"</li>
              <li>Disable all AI automation</li>
              <li>Stop all messaging sequences</li>
              <li>Remove from scheduled messages</li>
            </ul>
            <p className="text-sm font-medium text-amber-600">
              This action can be reversed by changing the lead status back.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Mark as Lost
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MarkLostConfirmDialog;
