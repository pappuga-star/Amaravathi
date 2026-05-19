import type { FilterQuery, Model } from 'mongoose';

export type RankedSearchField = {
  field: string;
  keyField?: string;
  weight?: number;
  /** code fields get stronger exact/prefix weighting */
  category?: 'code' | 'name' | 'text';
};

type SearchExecutionMode = 'contains' | 'prefix';

export interface SearchPlanOptions {
  normalizedQuery: string;
  fields: RankedSearchField[];
  mode?: SearchExecutionMode;
}

interface SearchPlan {
  filter: FilterQuery<any>;
  normalizedQuery: string;
  /** true when the backing engine had to fall back to non-primary strategy */
  fallbackUsed: boolean;
  engine: 'regex' | 'prefix' | 'atlas';
}

export interface SearchOptions<T = any> {
  model: Model<T>;
  normalizedQuery: string;
  fields: RankedSearchField[];
  mode?: SearchExecutionMode;
  limit?: number;
  baseFilter?: FilterQuery<T>;
  projection?: Record<string, 0 | 1> | string;
  sort?: Record<string, 1 | -1>;
}

export interface SearchResult<T = any> {
  items: T[];
  engine: 'regex' | 'prefix' | 'atlas';
  fallbackUsed: boolean;
}

export interface SearchEngine {
  buildPlan(options: SearchPlanOptions): SearchPlan;
  search?<T = any>(options: SearchOptions<T>): Promise<SearchResult<T>>;
}
