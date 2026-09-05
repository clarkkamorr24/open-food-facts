"use client";

import { useTranslation } from "@/components/providers/translation-provider";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/use-checkout";

export function SubscribeCta() {
  const { dictionary } = useTranslation();
  const { startCheckout, isStarting, isError } = useCheckout();

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{dictionary.subscription.lockedTitle}</p>
        <p className="text-sm text-muted-foreground">{dictionary.subscription.lockedBody}</p>
      </div>

      <Button type="button" onClick={() => startCheckout()} disabled={isStarting}>
        {isStarting ? dictionary.subscription.redirecting : dictionary.subscription.subscribe}
      </Button>

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          <span aria-hidden="true">⚠ </span>
          {dictionary.subscription.checkoutError}
        </p>
      ) : null}
    </div>
  );
}
