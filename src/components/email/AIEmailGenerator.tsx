
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, Send, RefreshCw, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIEmailGeneratorProps {
  leadId?: string;
  leadFirstName?: string;
  leadLastName?: string;
  vehicleInterest?: string;
  onEmailGenerated: (subject: string, content: string) => void;
  onClose: () => void;
}

const AIEmailGenerator = ({ 
  leadId, 
  leadFirstName = '', 
  leadLastName = '', 
  vehicleInterest = '',
  onEmailGenerated, 
  onClose 
}: AIEmailGeneratorProps) => {
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [emailPurpose, setEmailPurpose] = useState('');
  const { toast } = useToast();

  const generateEmail = async () => {
    try {
      setIsGenerating(true);
      
      const prompt = `Generate a professional email for a car dealership lead:
      
Lead Information:
- Name: ${leadFirstName} ${leadLastName}
- Vehicle Interest: ${vehicleInterest}
- Email Purpose: ${emailPurpose || 'Follow up on vehicle inquiry'}

Please generate:
1. A compelling subject line
2. A professional email body that is personalized and engaging

The email should be warm, professional, and focused on helping the customer find the right vehicle. Include a clear call to action.

Format your response as JSON:
{
  "subject": "subject line here",
  "content": "email body here"
}`;

      const { data, error } = await supabase.functions.invoke('generate-ai-message', {
        body: {
          leadId: leadId || 'email-generation',
          stage: 'email_generation',
          context: {
            prompt: prompt,
            email_purpose: emailPurpose,
            lead_name: `${leadFirstName} ${leadLastName}`,
            vehicle_interest: vehicleInterest
          }
        }
      });

      if (error) throw error;

      // Try to parse as JSON, fallback to structured text parsing
      let subject = '';
      let content = '';
      
      try {
        const parsed = JSON.parse(data.message);
        subject = parsed.subject || '';
        content = parsed.content || '';
      } catch {
        // Fallback parsing if not JSON
        const lines = data.message.split('\n');
        const subjectLine = lines.find(line => line.toLowerCase().includes('subject'));
        const contentStart = lines.findIndex(line => line.toLowerCase().includes('content') || line.toLowerCase().includes('body'));
        
        if (subjectLine) {
          subject = subjectLine.replace(/.*subject[:\-\s]*/i, '').trim();
        }
        if (contentStart >= 0) {
          content = lines.slice(contentStart + 1).join('\n').trim();
        }
        
        // If parsing fails, use the whole message as content
        if (!subject && !content) {
          subject = `Follow up on your ${vehicleInterest} inquiry`;
          content = data.message;
        }
      }

      if (subject || content) {
        setGeneratedSubject(subject);
        setGeneratedContent(content);
        setIsEditing(true);
        toast({
          title: "Email Generated",
          description: "Review and edit the email before using it",
        });
      } else {
        toast({
          title: "Generation Failed",
          description: "Could not generate email content. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating email:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseEmail = () => {
    if (generatedSubject.trim() || generatedContent.trim()) {
      onEmailGenerated(generatedSubject.trim(), generatedContent.trim());
      onClose();
    }
  };

  const handleRegenerate = () => {
    setGeneratedSubject('');
    setGeneratedContent('');
    setIsEditing(false);
    generateEmail();
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-blue-800">AI Email Generator</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-purpose">Email Purpose (optional)</Label>
              <Input
                id="email-purpose"
                value={emailPurpose}
                onChange={(e) => setEmailPurpose(e.target.value)}
                placeholder="e.g., Follow up on test drive, Send pricing information, Schedule appointment"
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            
            <div className="text-center py-6">
              <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-blue-700 mb-4">
                Generate a personalized email for {leadFirstName} {leadLastName}
                {vehicleInterest && ` about their interest in ${vehicleInterest}`}
              </p>
              <Button
                onClick={generateEmail}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    Generate Email
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-blue-800 mb-2 block">
                Subject Line:
              </Label>
              <Input
                value={generatedSubject}
                onChange={(e) => setGeneratedSubject(e.target.value)}
                className="border-blue-200 focus:border-blue-500"
                placeholder="Email subject..."
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-blue-800 mb-2 block">
                Email Content:
              </Label>
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="min-h-[200px] border-blue-200 focus:border-blue-500"
                placeholder="Email content will appear here..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUseEmail}
                disabled={!generatedSubject.trim() && !generatedContent.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Use This Email
              </Button>
              <Button
                onClick={handleRegenerate}
                variant="outline"
                disabled={isGenerating}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIEmailGenerator;
