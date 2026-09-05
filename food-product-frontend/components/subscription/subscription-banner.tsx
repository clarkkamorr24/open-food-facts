"use client";

import { useTranslation } from "@/components/providers/translation-provider";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import type { SubscriptionStatus } from "@/types/subscription";

interface SubscriptionBannerProps {
  checkoutOutcome?: "success" | "cancelled";
}

const NOTABLE_STATUSES = [
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

type NotableStatus = (typeof NOTABLE_STATUSES)[number];

function isNotableStatus(status: SubscriptionStatus | null): status is NotableStatus {
  return status !== null && NOTABLE_STATUSES.includes(status as NotableStatus);
}

export function SubscriptionBanner({ checkoutOutcome }: SubscriptionBannerProps) {
  const { dictionary, locale, format } = useTranslation();
  const { subscription, isActive } = useSubscription({
    awaitingActivation: checkoutOutcome === "success",
  });

  if (isActive && subscription) {
    const renewal = subscription.currentPeriodEnd
      ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
          new Date(subscription.currentPeriodEnd)
        )
      : null;

    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <Badge variant="success">
          <span aria-hidden="true">✓ </span>
          {dictionary.subscription.activeTitle}
        </Badge>
        {renewal ? (
          <span className="text-sm text-muted-foreground">
            {format(dictionary.subscription.renewsOn, { date: renewal })}
          </span>
        ) : null}
      </div>
    );
  }

  if (checkoutOutcome === "success") {
    return (
      <div role="status" className="rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-sm font-medium">{dictionary.subscription.checkoutSuccess}</p>
        <p className="text-sm text-muted-foreground">
          {dictionary.subscription.pendingActivation}
        </p>
      </div>
    );
  }

  if (checkoutOutcome === "cancelled") {
    return (
      <div role="status" className="rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {dictionary.subscription.checkoutCancelled}
        </p>
      </div>
    );
  }

  const status = subscription?.status ?? null;

  if (isNotableStatus(status)) {
    return (
      <div role="status" className="rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {dictionary.subscription.status[status]}
        </p>
      </div>
    );
  }

  return null;
}
