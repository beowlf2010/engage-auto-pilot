
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Star, 
  Calendar,
  Car,
  DollarSign,
  X
} from 'lucide-react';

interface MessageTemplatesProps {
  onSelectTemplate: (message: string, isTemplate: boolean) => void;
  onClose: () => void;
}

const MessageTemplates = ({ onSelectTemplate, onClose }: MessageTemplatesProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const templates = {
    greeting: [
      {
        id: 1,
        title: 'Initial Contact',
        message: 'Hi [Name]! Thanks for your interest in our [Vehicle]. I\'m here to help you find the perfect car. When would be a good time to discuss your needs?',
        category: 'greeting',
        tags: ['first-contact', 'warm']
      },
      {
        id: 2,
        title: 'Follow-up',
        message: 'Hi [Name]! Just wanted to follow up on your interest in the [Vehicle]. Do you have any questions I can help answer?',
        category: 'greeting',
        tags: ['follow-up', 'gentle']
      }
    ],
    pricing: [
      {
        id: 3,
        title: 'Price Quote',
        message: 'Great news! I have current pricing on the [Vehicle] you\'re interested in. The best price I can offer is [Price]. This includes all applicable rebates. Would you like to schedule a time to discuss?',
        category: 'pricing',
        tags: ['price', 'rebates']
      },
      {
        id: 4,
        title: 'Financing Options',
        message: 'We have excellent financing options available! With approved credit, you could drive home the [Vehicle] for as low as [Payment]/month. Let\'s get you pre-approved today!',
        category: 'pricing',
        tags: ['financing', 'payment']
      }
    ],
    scheduling: [
      {
        id: 5,
        title: 'Test Drive',
        message: 'Would you like to schedule a test drive for the [Vehicle]? I have availability [TimeSlots]. Just let me know what works best for you!',
        category: 'scheduling',
        tags: ['test-drive', 'appointment']
      },
      {
        id: 6,
        title: 'Showroom Visit',
        message: 'I\'d love to show you the [Vehicle] in person! When would be convenient for you to visit our showroom? I can also answer any questions you might have.',
        category: 'scheduling',
        tags: ['showroom', 'visit']
      }
    ]
  };

  const allTemplates = [...templates.greeting, ...templates.pricing, ...templates.scheduling];

  const filteredTemplates = allTemplates.filter(template =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTemplateSelect = (template: any) => {
    onSelectTemplate(template.message, true);
  };

  const handleCustomSend = () => {
    if (customMessage.trim()) {
      onSelectTemplate(customMessage.trim(), true);
      setCustomMessage('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Templates
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent className="max-h-[60vh] overflow-y-auto">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="greeting">Greeting</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateSelect(template)}
                />
              ))}
            </TabsContent>

            <TabsContent value="greeting" className="space-y-3 mt-4">
              {templates.greeting.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateSelect(template)}
                />
              ))}
            </TabsContent>

            <TabsContent value="pricing" className="space-y-3 mt-4">
              {templates.pricing.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateSelect(template)}
                />
              ))}
            </TabsContent>

            <TabsContent value="scheduling" className="space-y-3 mt-4">
              {templates.scheduling.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateSelect(template)}
                />
              ))}
            </TabsContent>
          </Tabs>

          {/* Custom Message Section */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium mb-3">Custom Message</h4>
            <div className="space-y-3">
              <Textarea
                placeholder="Type your custom message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="min-h-[100px]"
                maxLength={160}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {customMessage.length}/160 characters
                </span>
                <Button
                  onClick={handleCustomSend}
                  disabled={!customMessage.trim()}
                  size="sm"
                >
                  Send Custom Message
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TemplateCard = ({ template, onSelect }: { template: any; onSelect: () => void }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'greeting': return <Star className="h-4 w-4" />;
      case 'pricing': return <DollarSign className="h-4 w-4" />;
      case 'scheduling': return <Calendar className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className="p-4 hover:bg-slate-50 cursor-pointer border-l-4 border-l-blue-500" onClick={onSelect}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getCategoryIcon(template.category)}
          <h4 className="font-medium">{template.title}</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {template.category}
        </Badge>
      </div>
      <p className="text-sm text-slate-600 mb-3">{template.message}</p>
      <div className="flex items-center gap-1">
        {template.tags.map((tag: string) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    </Card>
  );
};

export default MessageTemplates;
