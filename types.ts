
export interface TopFix {
  fix: string;
  reason: string;
}

export interface AIAnalysisIndicator {
  label: string;
  value: number; // 0-100
  description: string;
}

export interface AIAnalysis {
  risk_level: 'low' | 'moderate' | 'high';
  verdict_summary: string;
  indicators: AIAnalysisIndicator[];
}

export interface CriterionResult {
  criterion: string;
  status: 'met' | 'weak' | 'missing';
  userStatus?: 'met' | 'weak' | 'missing'; // Manual override
  why: string;
  evidence: string;
  exact_fix: string;
  visual_coordinates?: { 
    x: number; 
    y: number;
    file_index?: number; 
  }; 
  rewrite_suggestion?: string;
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  data: string; // Base64 string
}

export interface AppState {
  rubric: string;
  rubricFiles: UploadedFile[];
  essay: string;
  essayFiles: UploadedFile[];
  essayExplanation: string;
  workType: string; // e.g., 'Essay', 'Discussion', 'Presentation'
  isStrict: boolean;
  isRubricVague: boolean;
  isLoading: boolean;
  error: string | null;
  result: AnalysisResult | null;
  viewMode: 'list' | 'feedback';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AnalysisResult {
  summary: {
    score: number;
    ai_score: number;
    ai_analysis: AIAnalysis;
    met: number;
    weak: number;
    missing: number;
    top_fixes: TopFix[];
  };
  criteria: CriterionResult[];
}
