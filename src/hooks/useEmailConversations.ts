
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService } from '@/services/emailService';
import { SendEmailRequest } from '@/types/email';
import { toast } from '@/hooks/use-toast';

export const useEmailConversations = (leadId: string) => {
  return useQuery({
    queryKey: ['email-conversations', leadId],
    queryFn: () => emailService.getEmailConversations(leadId),
    enabled: !!leadId,
  });
};

export const useSendEmail = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: emailService.sendEmail,
    onSuccess: (_, variables) => {
      if (variables.leadId) {
        queryClient.invalidateQueries({ queryKey: ['email-conversations', variables.leadId] });
      }
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    },
  });
};
