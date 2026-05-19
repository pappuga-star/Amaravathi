export interface SearchPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SearchResponse<T> {
  items: T[];
  pagination?: SearchPagination;
  total?: number;
  page?: number;
  limit?: number;
}
