"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { subscriptionService } from "@/services/subscription.service";

interface UseSubscriptionOptions {
  awaitingActivation?: boolean;
}

const ACTIVATION_POLL_INTERVAL_MS = 2000;

export function useSubscription({ awaitingActivation = false }: UseSubscriptionOptions = {}) {
  const result = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: ({ signal }) => subscriptionService.getSubscription(signal),
    refetchInterval: (query) => {
      if (!awaitingActivation) return false;
      return query.state.data?.isActive ? false : ACTIVATION_POLL_INTERVAL_MS;
    },
  });

  return {
    subscription: result.data ?? null,
    isActive: result.data?.isActive ?? false,
    isLoading: result.isLoading,
    isError: result.isError,
  };
}
