
import { toast } from '@/hooks/use-toast';
import { sendInitialMessage } from './initialMessageService';

export const triggerImmediateMessage = async (leadId: string, profile: any): Promise<void> => {
  const result = await sendInitialMessage(leadId, profile);
  
  if (result.success) {
    toast({
      title: "Message Sent",
      description: `Enhanced AI warm introduction sent successfully: ${result.message}`,
      variant: "default"
    });
  } else {
    toast({
      title: "Error",
      description: result.error || "Failed to send initial message",
      variant: "destructive"
    });
  }
};
