export type Term = {
  id: number;
  term: string;
  definition: string;
  syllabus_category: string | null;
  tags: string[];
  reference_links: string[];
  created_at: string;
  updated_at: string;
};

export type TermListResponse = {
  items: Term[];
  total: number;
};

export type TermInput = {
  term: string;
  definition: string;
  syllabus_category: string | null;
  tags: string[];
  reference_links: string[];
};
