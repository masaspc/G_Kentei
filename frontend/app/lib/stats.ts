export type DailyCount = {
  day: string;
  attempts: number;
  correct: number;
};

export type CategoryAccuracy = {
  category: string;
  attempts: number;
  correct: number;
  accuracy: number;
};

export type DashboardStats = {
  total_questions: number;
  total_attempts: number;
  overall_accuracy: number;
  streak_days: number;
  due_today: number;
  daily_7d: DailyCount[];
  weak_categories: CategoryAccuracy[];
};

export type HeatmapCell = {
  category: string;
  difficulty: number;
  attempts: number;
  correct: number;
  accuracy: number;
};

export type HeatmapResponse = {
  cells: HeatmapCell[];
};

export type ProgressPoint = {
  day: string;
  attempts: number;
  correct: number;
  cumulative_attempts: number;
};

export type ProgressResponse = {
  points: ProgressPoint[];
};
