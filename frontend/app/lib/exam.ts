import { QuestionType } from "./question";

export type ExamQuestion = {
  id: number;
  question_text: string;
  question_type: QuestionType;
  choices: unknown[];
  syllabus_category: string;
  subcategory: string | null;
  difficulty: number;
};

export type ExamStartResponse = {
  exam_session_id: number;
  started_at: string;
  time_limit_seconds: number;
  items: ExamQuestion[];
};

export type ExamCategoryBreakdown = {
  category: string;
  attempts: number;
  correct: number;
};

export type ExamResultItem = {
  question_id: number;
  question_text: string;
  syllabus_category: string;
  difficulty: number;
  is_correct: boolean;
  selected_answer: unknown;
  correct_answer: unknown;
  explanation: string | null;
  response_time_ms: number | null;
};

export type ExamResult = {
  exam_session_id: number;
  started_at: string;
  completed_at: string;
  total_questions: number;
  correct_count: number;
  accuracy: number;
  elapsed_seconds: number;
  by_category: ExamCategoryBreakdown[];
  items: ExamResultItem[];
};
