import { QuestionType } from "./question";

export type PracticeQuestion = {
  id: number;
  question_text: string;
  question_type: QuestionType;
  choices: unknown[];
  syllabus_category: string;
  subcategory: string | null;
  difficulty: number;
};

export type StudySessionResponse = {
  items: PracticeQuestion[];
};

export type StudyAnswerResponse = {
  study_log_id: number;
  is_correct: boolean;
  correct_answer: unknown;
  explanation: string | null;
  reference_links: string[];
};

export type SessionCondition = "all" | "unanswered" | "srs_due" | "bookmarked";

export type SrsRating = 0 | 1 | 2 | 3;

export type EvaluateResponse = {
  next_review_in_days: number;
};

export type SessionRecord = {
  question: PracticeQuestion;
  selected: unknown;
  result: StudyAnswerResponse;
};
