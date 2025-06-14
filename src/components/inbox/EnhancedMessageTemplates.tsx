
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Star, 
  Calendar,
  Car,
  DollarSign,
  X,
  Edit,
  Trash2,
  Share,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useMessageTemplates, MessageTemplate } from '@/hooks/useMessageTemplates';

interface EnhancedMessageTemplatesProps {
  onSelectTemplate: (message: string, isTemplate: boolean) => void;
  onClose: () => void;
  leadContext?: {
    leadName?: string;
    vehicleInterest?: string;
    price?: string;
  };
}

const EnhancedMessageTemplates = ({ onSelectTemplate, onClose, leadContext }: EnhancedMessageTemplatesProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  
  const { 
    templates, 
    loading, 
    error, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate, 
    useTemplate,
    processTemplateContent 
  } = useMessageTemplates();

  const [newTemplate, setNewTemplate] = useState({
    title: '',
    content: '',
    category: 'general',
    is_shared: false
  });

  const categories = ['all', 'greeting', 'pricing', 'scheduling', 'follow-up', 'custom'];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTemplateSelect = async (template: MessageTemplate) => {
    try {
      await useTemplate(template.id);
      const processedContent = processTemplateContent(template.content, leadContext);
      onSelectTemplate(processedContent, true);
    } catch (error) {
      console.error('Error using template:', error);
      // Still allow using the template even if usage tracking fails
      const processedContent = processTemplateContent(template.content, leadContext);
      onSelectTemplate(processedContent, true);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await createTemplate(newTemplate);
      setNewTemplate({ title: '', content: '', category: 'general', is_shared: false });
      setShowCreateDialog(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      await updateTemplate(editingTemplate.id, editingTemplate);
      setEditingTemplate(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'greeting': return <Star className="h-4 w-4" />;
      case 'pricing': return <DollarSign className="h-4 w-4" />;
      case 'scheduling': return <Calendar className="h-4 w-4" />;
      case 'follow-up': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <Button onClick={onClose} className="w-full mt-4">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Templates
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Template Title"
                      value={newTemplate.title}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(cat => cat !== 'all').map(category => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Template content... Use [Name], [Vehicle], [Price] for variables"
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                      className="min-h-[100px]"
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newTemplate.is_shared}
                        onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, is_shared: checked }))}
                      />
                      <label className="text-sm">Share with team</label>
                    </div>
                    <Button onClick={handleCreateTemplate} className="w-full">
                      Create Template
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No templates found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateSelect(template)}
                  onEdit={setEditingTemplate}
                  onDelete={deleteTemplate}
                  getCategoryIcon={getCategoryIcon}
                  leadContext={leadContext}
                  processTemplateContent={processTemplateContent}
                />
              ))}
            </div>
          )}
        </CardContent>

        {/* Edit Template Dialog */}
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            {editingTemplate && (
              <div className="space-y-4">
                <Input
                  placeholder="Template Title"
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                />
                <Select 
                  value={editingTemplate.category} 
                  onValueChange={(value) => setEditingTemplate(prev => prev ? ({ ...prev, category: value }) : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat !== 'all').map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Template content..."
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                  className="min-h-[100px]"
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingTemplate.is_shared}
                    onCheckedChange={(checked) => setEditingTemplate(prev => prev ? ({ ...prev, is_shared: checked }) : null)}
                  />
                  <label className="text-sm">Share with team</label>
                </div>
                <Button onClick={handleUpdateTemplate} className="w-full">
                  Update Template
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

const TemplateCard = ({ 
  template, 
  onSelect, 
  onEdit, 
  onDelete, 
  getCategoryIcon, 
  leadContext,
  processTemplateContent 
}: {
  template: MessageTemplate;
  onSelect: () => void;
  onEdit: (template: MessageTemplate) => void;
  onDelete: (id: string) => void;
  getCategoryIcon: (category: string) => React.ReactNode;
  leadContext?: any;
  processTemplateContent: (content: string, variables?: any) => string;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(template.id);
    } catch (error) {
      setIsDeleting(false);
    }
  };

  const previewContent = processTemplateContent(template.content, leadContext);

  return (
    <Card className="p-4 hover:bg-slate-50 cursor-pointer border-l-4 border-l-blue-500">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getCategoryIcon(template.category)}
          <h4 className="font-medium">{template.title}</h4>
          {template.is_shared && (
            <Badge variant="secondary" className="text-xs">
              <Share className="h-3 w-3 mr-1" />
              Shared
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            Used {template.usage_count}x
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => onEdit(template)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <div onClick={onSelect}>
        <p className="text-sm text-slate-600 mb-3">{previewContent}</p>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {template.category}
          </Badge>
          <Button size="sm" variant="outline">
            Use Template
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EnhancedMessageTemplates;
