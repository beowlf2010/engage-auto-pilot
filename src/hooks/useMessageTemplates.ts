
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  variables: string[];
  is_shared: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

// Helper function to transform database row to MessageTemplate
const transformTemplate = (row: any): MessageTemplate => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  variables: Array.isArray(row.variables) ? row.variables : [],
  is_shared: row.is_shared,
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
  usage_count: row.usage_count
});

export const useMessageTemplates = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      
      const transformedTemplates = (data || []).map(transformTemplate);
      setTemplates(transformedTemplates);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
      toast({
        title: "Error",
        description: "Failed to load message templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          title: template.title,
          content: template.content,
          category: template.category,
          variables: template.variables,
          is_shared: template.is_shared,
          created_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;

      const transformedTemplate = transformTemplate(data);
      setTemplates(prev => [transformedTemplate, ...prev]);
      toast({
        title: "Success",
        description: "Template created successfully"
      });
      
      return transformedTemplate;
    } catch (err) {
      console.error('Error creating template:', err);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .update({
          title: updates.title,
          content: updates.content,
          category: updates.category,
          variables: updates.variables,
          is_shared: updates.is_shared
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const transformedTemplate = transformTemplate(data);
      setTemplates(prev => prev.map(t => t.id === id ? transformedTemplate : t));
      toast({
        title: "Success",
        description: "Template updated successfully"
      });
      
      return transformedTemplate;
    } catch (err) {
      console.error('Error updating template:', err);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Success",
        description: "Template deleted successfully"
      });
    } catch (err) {
      console.error('Error deleting template:', err);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
      throw err;
    }
  };

  const useTemplate = async (templateId: string) => {
    try {
      await supabase.rpc('increment_template_usage', { template_id: templateId });
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === templateId 
          ? { ...t, usage_count: t.usage_count + 1 }
          : t
      ));
    } catch (err) {
      console.error('Error incrementing template usage:', err);
    }
  };

  const processTemplateContent = (content: string, variables: Record<string, string> = {}) => {
    let processedContent = content;
    
    // Replace common variables
    const defaultVariables = {
      '[Name]': variables.leadName || '[Name]',
      '[Vehicle]': variables.vehicleInterest || '[Vehicle]',
      '[Price]': variables.price || '[Price]',
      '[Payment]': variables.payment || '[Payment]',
      '[TimeSlots]': variables.timeSlots || '[TimeSlots]'
    };

    Object.entries(defaultVariables).forEach(([key, value]) => {
      processedContent = processedContent.replace(new RegExp(key, 'g'), value);
    });

    return processedContent;
  };

  useEffect(() => {
    if (profile) {
      fetchTemplates();
    }
  }, [profile]);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    processTemplateContent,
    refetch: fetchTemplates
  };
};
