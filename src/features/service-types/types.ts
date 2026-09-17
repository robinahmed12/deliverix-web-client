export interface ServiceTypeListItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  version: number;
  createdAt: string;
}

export interface ServiceTypeFilters {
  active?: boolean;
  search?: string;
}