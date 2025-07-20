import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mic, Edit, Trash2, Plus, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VoicemailTemplate {
  id: string;
  template_name: string;
  script_content: string;
  attempt_number: number;
  is_default: boolean;
  is_active: boolean;
  variables: any;
  created_at: string;
}

const VoicemailTemplateManager = () => {
  const [templates, setTemplates] = useState<VoicemailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<VoicemailTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const defaultVariables = {
    first_name: 'John',
    salesperson_name: 'Finn', 
    dealership_name: 'Jason Pilger Chevrolet',
    phone_number: '(251) 368-8600',
    vehicle_interest: '2024 Toyota Camry'
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('voicemail_templates')
        .select('*')
        .order('attempt_number', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load voicemail templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: Partial<VoicemailTemplate>) => {
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('voicemail_templates')
          .update({
            template_name: template.template_name,
            script_content: template.script_content,
            attempt_number: template.attempt_number,
            is_active: template.is_active
          })
          .eq('id', editingTemplate.id);
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Template updated successfully' });
      } else {
        const { error } = await supabase
          .from('voicemail_templates')
          .insert({
            template_name: template.template_name!,
            script_content: template.script_content!,
            attempt_number: template.attempt_number || 1,
            is_active: template.is_active ?? true
          });
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Template created successfully' });
      }
      
      fetchTemplates();
      setEditingTemplate(null);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    }
  };

  const toggleTemplateActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('voicemail_templates')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
      fetchTemplates();
      toast({ 
        title: 'Success', 
        description: `Template ${isActive ? 'activated' : 'deactivated'}` 
      });
    } catch (error) {
      console.error('Error toggling template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template status',
        variant: 'destructive'
      });
    }
  };

  const setDefaultTemplate = async (id: string, attemptNumber: number) => {
    try {
      // Remove default from other templates for this attempt number
      await supabase
        .from('voicemail_templates')
        .update({ is_default: false })
        .eq('attempt_number', attemptNumber);

      // Set this template as default
      const { error } = await supabase
        .from('voicemail_templates')
        .update({ is_default: true })
        .eq('id', id);
      
      if (error) throw error;
      fetchTemplates();
      toast({ title: 'Success', description: 'Default template updated' });
    } catch (error) {
      console.error('Error setting default template:', error);
      toast({
        title: 'Error',
        description: 'Failed to set default template',
        variant: 'destructive'
      });
    }
  };

  const previewTemplate = (template: VoicemailTemplate) => {
    let preview = template.script_content;
    Object.entries(defaultVariables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    return preview;
  };

  const TemplateForm = ({ template, onSave, onCancel }: {
    template?: VoicemailTemplate;
    onSave: (data: Partial<VoicemailTemplate>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      template_name: template?.template_name || '',
      script_content: template?.script_content || '',
      attempt_number: template?.attempt_number || 1,
      is_active: template?.is_active ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="template_name">Template Name</Label>
          <Input
            id="template_name"
            value={formData.template_name}
            onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
            placeholder="e.g., First Attempt - Professional"
            required
          />
        </div>

        <div>
          <Label htmlFor="attempt_number">Attempt Number</Label>
          <Select 
            value={formData.attempt_number.toString()} 
            onValueChange={(value) => setFormData({ ...formData, attempt_number: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">First Attempt</SelectItem>
              <SelectItem value="2">Second Attempt</SelectItem>
              <SelectItem value="3">Final Attempt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="script_content">Script Content</Label>
          <Textarea
            id="script_content"
            value={formData.script_content}
            onChange={(e) => setFormData({ ...formData, script_content: e.target.value })}
            placeholder="Hi {first_name}, this is {salesperson_name} from {dealership_name}..."
            rows={6}
            required
          />
          <p className="text-sm text-muted-foreground mt-1">
            Available variables: {Object.keys(defaultVariables).map(key => `{${key}}`).join(', ')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active Template</Label>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {template ? 'Update' : 'Create'} Template
          </Button>
        </div>
      </form>
    );
  };

  if (loading) {
    return <div className="p-6">Loading voicemail templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Voicemail Templates</h3>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Voicemail Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              onSave={saveTemplate}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {[1, 2, 3].map(attemptNumber => {
          const attemptTemplates = templates.filter(t => t.attempt_number === attemptNumber);
          const defaultTemplate = attemptTemplates.find(t => t.is_default);
          
          return (
            <Card key={attemptNumber}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Attempt {attemptNumber} Templates</span>
                  <Badge variant={defaultTemplate ? 'default' : 'secondary'}>
                    {attemptTemplates.length} template{attemptTemplates.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attemptTemplates.length === 0 ? (
                  <p className="text-muted-foreground">No templates for attempt {attemptNumber}</p>
                ) : (
                  <div className="space-y-4">
                    {attemptTemplates.map(template => (
                      <div key={template.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{template.template_name}</h4>
                            {template.is_default && (
                              <Badge variant="default">Default</Badge>
                            )}
                            {!template.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingTemplate(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Switch
                              checked={template.is_active}
                              onCheckedChange={(checked) => toggleTemplateActive(template.id, checked)}
                            />
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">
                          {previewTemplate(template)}
                        </p>

                        <div className="flex space-x-2">
                          {!template.is_default && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDefaultTemplate(template.id, template.attempt_number)}
                            >
                              Set as Default
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Voicemail Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              template={editingTemplate}
              onSave={saveTemplate}
              onCancel={() => setEditingTemplate(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default VoicemailTemplateManager;