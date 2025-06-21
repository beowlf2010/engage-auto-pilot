
export interface MessagePreviewInlineProps {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  aiStage: string;
  onMessageSent: () => void;
  onPreviewFull: () => void;
}

export interface IssueType {
  value: string;
  label: string;
  description: string;
}

export interface MessageQuality {
  score: number;
  color: string;
}

export interface MessagePreviewState {
  message: string;
  loading: boolean;
  regenerating: boolean;
  sending: boolean;
  selectedIssue: string;
  showIssueSelector: boolean;
  conversationHistory: any[];
  error: string;
  leadPhone: string;
}
