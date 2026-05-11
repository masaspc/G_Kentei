export type QuestionType = "single" | "multi" | "true_false" | "fill_blank";
export type ExplanationSource = "manual" | "claude_haiku" | "claude_sonnet";

export type Question = {
  id: number;
  question_text: string;
  question_type: QuestionType;
  choices: unknown[];
  correct_answer: unknown;
  explanation: string | null;
  explanation_source: ExplanationSource | null;
  reference_links: string[];
  syllabus_category: string;
  subcategory: string | null;
  difficulty: number;
  tags: string[];
  source: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type QuestionListResponse = {
  items: Question[];
  total: number;
  page: number;
  page_size: number;
};

export type QuestionInput = {
  question_text: string;
  question_type: QuestionType;
  choices: unknown[];
  correct_answer: unknown;
  explanation: string | null;
  explanation_source: ExplanationSource | null;
  reference_links: string[];
  syllabus_category: string;
  subcategory: string | null;
  difficulty: number;
  tags: string[];
  source: string | null;
  is_active: boolean;
};
