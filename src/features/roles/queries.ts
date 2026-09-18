import { useQuery } from "@tanstack/react-query";
import { listRoles } from "./api";
import type { RoleListItem } from "./types";

export const roleKeys = {
  all: ["roles"] as const,
};

export function useRoles(initialData?: RoleListItem[]) {
  return useQuery({
    queryKey: roleKeys.all,
    queryFn: async () => {
      const result = await listRoles();
      return result.data;
    },
    initialData,
    staleTime: 5 * 60_000,
  });
}