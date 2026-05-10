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
  is_correct: boolean;
  correct_answer: unknown;
  explanation: string | null;
  reference_links: string[];
};

export type SessionCondition = "all" | "unanswered";

export type SessionRecord = {
  question: PracticeQuestion;
  selected: unknown;
  result: StudyAnswerResponse;
};
