"use client";

import { useMutation } from "@tanstack/react-query";

import { subscriptionService } from "@/services/subscription.service";

export function useCheckout() {
  const mutation = useMutation({
    mutationFn: () => {
      const returnPath =
        typeof window === "undefined"
          ? undefined
          : `${window.location.pathname}${window.location.search}`;

      return subscriptionService.createCheckoutSession(returnPath);
    },
    onSuccess: ({ checkoutUrl }) => {
      window.location.assign(checkoutUrl);
    },
  });

  return {
    startCheckout: mutation.mutate,
    isStarting: mutation.isPending || mutation.isSuccess,
    isError: mutation.isError,
  };
}
