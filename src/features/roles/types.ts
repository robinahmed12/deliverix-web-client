export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: string;
}