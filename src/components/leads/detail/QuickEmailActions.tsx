
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Plus, Zap, Clock } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useSendEmail } from '@/hooks/useEmailConversations';
import { emailService } from '@/services/emailService';

interface QuickEmailActionsProps {
  leadId: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadLastName?: string;
  vehicleInterest?: string;
  onComposeClick: () => void;
}

const QuickEmailActions: React.FC<QuickEmailActionsProps> = ({
  leadId,
  leadEmail,
  leadFirstName = '',
  leadLastName = '',
  vehicleInterest = '',
  onComposeClick
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const { data: templates = [] } = useEmailTemplates();
  const sendEmailMutation = useSendEmail();

  const handleQuickSend = async (templateId: string) => {
    if (!leadEmail || !templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const variables = {
      lead_first_name: leadFirstName,
      lead_last_name: leadLastName,
      vehicle_interest: vehicleInterest,
      salesperson_name: 'Your Sales Representative'
    };

    const subject = emailService.replaceTemplateVariables(template.subject, variables);
    const content = emailService.replaceTemplateVariables(template.content, variables);

    try {
      await sendEmailMutation.mutateAsync({
        to: leadEmail,
        subject,
        html: content,
        leadId,
        templateId
      });
      setSelectedTemplate('');
    } catch (error) {
      console.error('Failed to send quick email:', error);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Button onClick={onComposeClick} className="flex items-center space-x-2">
        <Plus className="w-4 h-4" />
        <span>Compose Email</span>
      </Button>

      <div className="flex items-center space-x-2">
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Quick templates" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{template.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedTemplate && (
          <Button
            onClick={() => handleQuickSend(selectedTemplate)}
            disabled={sendEmailMutation.isPending || !leadEmail}
            size="sm"
            variant="outline"
          >
            <Zap className="w-4 h-4 mr-1" />
            Send
          </Button>
        )}
      </div>

      <Button variant="outline" size="sm" className="flex items-center space-x-2">
        <Clock className="w-4 h-4" />
        <span>Schedule</span>
      </Button>
    </div>
  );
};

export default QuickEmailActions;
