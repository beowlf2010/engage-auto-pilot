
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useSendEmail } from '@/hooks/useEmailConversations';
import { emailService } from '@/services/emailService';
import { Loader2, Send, FileText, Bot } from 'lucide-react';
import AIEmailGenerator from './AIEmailGenerator';

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadLastName?: string;
  vehicleInterest?: string;
}

const EmailComposer = ({ 
  open, 
  onOpenChange, 
  leadId, 
  leadEmail, 
  leadFirstName = '',
  leadLastName = '',
  vehicleInterest = ''
}: EmailComposerProps) => {
  const [to, setTo] = useState(leadEmail || '');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('none');
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const { data: templates = [] } = useEmailTemplates();
  const sendEmailMutation = useSendEmail();

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setSubject('');
      setContent('');
      setSelectedTemplate('none');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (template) {
      const variables = {
        lead_first_name: leadFirstName,
        lead_last_name: leadLastName,
        vehicle_interest: vehicleInterest,
        salesperson_name: 'Your Sales Representative'
      };
      
      setSubject(emailService.replaceTemplateVariables(template.subject, variables));
      setContent(emailService.replaceTemplateVariables(template.content, variables));
      setSelectedTemplate(templateId);
    }
  };

  const handleAIEmailGenerated = (aiSubject: string, aiContent: string) => {
    setSubject(aiSubject);
    setContent(aiContent);
    setSelectedTemplate('none'); // Clear template selection when using AI
    setShowAIGenerator(false);
  };

  const handleSend = async () => {
    if (!to || !subject || !content) return;

    try {
      await sendEmailMutation.mutateAsync({
        to,
        subject,
        html: content,
        leadId,
        templateId: selectedTemplate === 'none' ? undefined : selectedTemplate,
      });
      
      // Reset form
      setTo('');
      setSubject('');
      setContent('');
      setSelectedTemplate('none');
      setShowAIGenerator(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="w-5 h-5" />
            <span>Compose Email</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI Email Generator */}
          {showAIGenerator && (
            <AIEmailGenerator
              leadId={leadId}
              leadFirstName={leadFirstName}
              leadLastName={leadLastName}
              vehicleInterest={vehicleInterest}
              onEmailGenerated={handleAIEmailGenerated}
              onClose={() => setShowAIGenerator(false)}
            />
          )}

          {/* Template Selection and AI Button */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="template">Email Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAIGenerator(true)}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Bot className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          </div>

          {/* Email Fields */}
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your email message here..."
              className="min-h-[200px]"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!to || !subject || !content || sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposer;
