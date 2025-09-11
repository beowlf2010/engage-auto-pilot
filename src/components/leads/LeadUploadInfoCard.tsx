import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Users, AlertTriangle, Zap } from 'lucide-react';

const LeadUploadInfoCard = () => {
  const features = [
    {
      icon: CheckCircle,
      title: "Smart Field Mapping",
      description: "Automatically detects and maps common lead fields"
    },
    {
      icon: Users,
      title: "Duplicate Detection",
      description: "Identifies existing leads by phone and email"
    },
    {
      icon: AlertTriangle,
      title: "Data Validation",
      description: "Validates phone numbers, emails, and required fields"
    },
    {
      icon: Zap,
      title: "Instant Processing",
      description: "Fast upload with real-time progress tracking"
    }
  ];

  return (
    <Card className="bg-card shadow-card border-border">
      <CardHeader>
        <CardTitle className="text-card-foreground">Upload Features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="p-1 rounded-full bg-primary/10 mt-0.5">
              <feature.icon className="h-3 w-3 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground">
                {feature.title}
              </h4>
              <p className="text-xs text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default LeadUploadInfoCard;