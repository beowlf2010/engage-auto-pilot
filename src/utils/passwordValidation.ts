/**
 * Password strength validation utilities
 */

export interface PasswordStrength {
  score: number; // 0-4 (weak to very strong)
  feedback: string[];
  isValid: boolean;
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
}

export const validatePassword = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Length requirements
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score += 1;
  }

  // Character variety
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasLowerCase) feedback.push('Include lowercase letters');
  if (!hasUpperCase) feedback.push('Include uppercase letters');
  if (!hasNumbers) feedback.push('Include numbers');
  if (!hasSpecialChars) feedback.push('Include special characters');

  // Calculate score based on character variety
  const varietyScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChars].filter(Boolean).length;
  score += varietyScore - 1; // -1 because we need at least 2 types

  // Common patterns to avoid
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /login/i,
    /welcome/i,
    /(.)\1{2,}/, // Repeated characters
    /^(.+)\1+$/, // Repeated patterns
  ];

  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    feedback.push('Avoid common patterns and repeated characters');
    score = Math.max(0, score - 1);
  }

  // Sequential characters
  const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password);
  if (hasSequential) {
    feedback.push('Avoid sequential characters');
    score = Math.max(0, score - 1);
  }

  // Ensure minimum requirements
  const isValid = password.length >= 8 && hasLowerCase && hasUpperCase && hasNumbers;
  
  if (!isValid) {
    score = Math.min(score, 1);
  }

  // Determine strength label
  let strength: PasswordStrength['strength'];
  if (score === 0) strength = 'very-weak';
  else if (score === 1) strength = 'weak';
  else if (score === 2) strength = 'fair';
  else if (score === 3) strength = 'good';
  else strength = 'strong';

  return {
    score,
    feedback,
    isValid,
    strength
  };
};

export const getPasswordStrengthColor = (strength: PasswordStrength['strength']): string => {
  switch (strength) {
    case 'very-weak': return 'text-red-600';
    case 'weak': return 'text-red-500';
    case 'fair': return 'text-yellow-500';
    case 'good': return 'text-blue-500';
    case 'strong': return 'text-green-500';
    default: return 'text-gray-500';
  }
};

export const getPasswordStrengthBg = (strength: PasswordStrength['strength']): string => {
  switch (strength) {
    case 'very-weak': return 'bg-red-200';
    case 'weak': return 'bg-red-300';
    case 'fair': return 'bg-yellow-300';
    case 'good': return 'bg-blue-300';
    case 'strong': return 'bg-green-300';
    default: return 'bg-gray-300';
  }
};