
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { emailService } from '@/services/emailService';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, Loader2 } from 'lucide-react';

interface BulkEmailActionProps {
  selectedLeads: Array<{
    id: string;
    email?: string;
    first_name: string;
    last_name: string;
    vehicle_interest?: string;
  }>;
  onComplete: () => void;
}

const BulkEmailAction = ({ selectedLeads, onComplete }: BulkEmailActionProps) => {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sending, setSending] = useState(false);
  
  const { data: templates = [] } = useEmailTemplates();
  const { toast } = useToast();

  const leadsWithEmail = selectedLeads.filter(lead => lead.email);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!subject || !content || leadsWithEmail.length === 0) return;

    setSending(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Send emails to each lead with personalized content
      for (const lead of leadsWithEmail) {
        try {
          const variables = {
            'lead_first_name': lead.first_name,
            'lead_last_name': lead.last_name,
            'vehicle_interest': lead.vehicle_interest || '',
            'salesperson_name': 'Your Sales Representative'
          };

          const personalizedSubject = emailService.replaceTemplateVariables(subject, variables);
          const personalizedContent = emailService.replaceTemplateVariables(content, variables);

          await emailService.sendEmail({
            to: lead.email!,
            subject: personalizedSubject,
            html: personalizedContent,
            leadId: lead.id,
            templateId: selectedTemplate || undefined,
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to send email to ${lead.email}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Bulk email completed",
        description: `Successfully sent ${successCount} emails${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      // Reset form
      setSubject('');
      setContent('');
      setSelectedTemplate('');
      setOpen(false);
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send bulk emails",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={leadsWithEmail.length === 0}
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Email ({leadsWithEmail.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Bulk Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              Sending to {leadsWithEmail.length} leads with email addresses.
              {selectedLeads.length - leadsWithEmail.length > 0 && (
                <span className="block mt-1">
                  {selectedLeads.length - leadsWithEmail.length} leads will be skipped (no email address).
                </span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Email Template (Optional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Email Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Email content - use {{lead_first_name}}, {{vehicle_interest}} for personalization"
              className="min-h-[150px]"
            />
            <p className="text-xs text-gray-500">
              Available variables: &#123;&#123;lead_first_name&#125;&#125;, &#123;&#123;lead_last_name&#125;&#125;, &#123;&#123;vehicle_interest&#125;&#125;, &#123;&#123;salesperson_name&#125;&#125;
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendBulkEmail}
              disabled={!subject || !content || leadsWithEmail.length === 0 || sending}
            >
              {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-2" />
              Send to {leadsWithEmail.length} Leads
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEmailAction;
