"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { userService } from "@/services/user.service";

export function useCurrentUser() {
  const result = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: ({ signal }) => userService.getCurrentUser(signal),
    staleTime: Infinity,
  });

  return {
    user: result.data ?? null,
    isLoading: result.isLoading,
  };
}
