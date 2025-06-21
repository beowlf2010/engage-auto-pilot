
import { EnhancedVehicleInterest } from './vehicleInterestDetector';

export interface DiscoveryQuestion {
  question: string;
  category: 'use_case' | 'features' | 'budget' | 'timeline' | 'trade' | 'financing';
  priority: 'high' | 'medium' | 'low';
  context: string;
  followUpTrigger?: string;
}

export const generateDiscoveryQuestions = (
  vehicleInterest: EnhancedVehicleInterest,
  conversationHistory: string
): DiscoveryQuestion[] => {
  const questions: DiscoveryQuestion[] = [];
  const askedQuestions = extractAskedQuestions(conversationHistory);

  // Use case questions
  if (vehicleInterest.useCase === 'unknown') {
    questions.push({
      question: "What will you primarily be using this truck for? Work, personal use, or a mix of both?",
      category: 'use_case',
      priority: 'high',
      context: 'Understanding primary use helps recommend right features',
      followUpTrigger: 'use_case_clarification'
    });
  }

  // Feature-specific questions
  const srwFeature = vehicleInterest.specificFeatures.find(f => f.feature === 'SRW');
  if (srwFeature && !hasAskedQuestion(askedQuestions, 'towing')) {
    questions.push({
      question: "Since you're interested in the SRW model, what kind of towing or hauling do you plan to do?",
      category: 'features',
      priority: 'high',
      context: 'SRW mentioned, need to understand towing needs',
      followUpTrigger: 'towing_requirements'
    });
  }

  // Budget exploration
  if (vehicleInterest.budgetSignals.length === 0 && !hasAskedQuestion(askedQuestions, 'budget')) {
    questions.push({
      question: "Do you have a budget range in mind, or would you like to explore financing options?",
      category: 'budget',
      priority: 'medium',
      context: 'No budget signals detected',
      followUpTrigger: 'budget_discussion'
    });
  }

  // Timeline questions
  if (vehicleInterest.timelineSignals.length === 0) {
    questions.push({
      question: "What's your timeline for making a decision? Are you looking to get into something soon?",
      category: 'timeline',
      priority: 'medium',
      context: 'No urgency signals detected',
      followUpTrigger: 'timeline_clarification'
    });
  }

  // Trade-in opportunity
  if (!hasAskedQuestion(askedQuestions, 'trade')) {
    questions.push({
      question: "Do you have a vehicle you'd like to trade in?",
      category: 'trade',
      priority: 'low',
      context: 'Potential trade opportunity',
      followUpTrigger: 'trade_discussion'
    });
  }

  return questions
    .filter(q => !isQuestionRedundant(q, conversationHistory))
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .slice(0, 2); // Limit to top 2 questions to avoid overwhelming
};

const extractAskedQuestions = (conversationHistory: string): string[] => {
  const questionPatterns = [
    /what.*(?:use|using|plan)/i,
    /budget|afford|payment/i,
    /timeline|when|soon/i,
    /trade|current vehicle/i,
    /financing|finance/i,
    /towing|hauling|pulling/i
  ];

  const askedQuestions: string[] = [];
  questionPatterns.forEach((pattern, index) => {
    if (pattern.test(conversationHistory)) {
      askedQuestions.push(['use', 'budget', 'timeline', 'trade', 'financing', 'towing'][index]);
    }
  });

  return askedQuestions;
};

const hasAskedQuestion = (askedQuestions: string[], category: string): boolean => {
  return askedQuestions.includes(category);
};

const isQuestionRedundant = (question: DiscoveryQuestion, conversationHistory: string): boolean => {
  const historyLower = conversationHistory.toLowerCase();
  const questionKeywords = question.question.toLowerCase().split(' ');
  
  // Check if key concepts from the question are already addressed
  const keywordMatches = questionKeywords.filter(word => 
    word.length > 3 && historyLower.includes(word)
  );
  
  return keywordMatches.length > 2; // If more than 2 key words already discussed
};
