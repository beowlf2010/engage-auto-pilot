import React from 'react';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthBg } from '@/utils/passwordValidation';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  showFeedback = true 
}) => {
  const strength = validatePassword(password);
  
  if (!password) {
    return null;
  }

  const progressValue = (strength.score / 4) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Progress value={progressValue} className="flex-1" />
        <Badge 
          variant="outline" 
          className={`text-xs ${getPasswordStrengthColor(strength.strength)}`}
        >
          {strength.strength.replace('-', ' ')}
        </Badge>
      </div>
      
      {showFeedback && strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((feedback, index) => (
            <div key={index} className="flex items-center space-x-2 text-xs">
              <XCircle className="w-3 h-3 text-red-500" />
              <span className="text-red-600">{feedback}</span>
            </div>
          ))}
        </div>
      )}
      
      {strength.isValid && (
        <div className="flex items-center space-x-2 text-xs">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-green-600">Password meets minimum requirements</span>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;