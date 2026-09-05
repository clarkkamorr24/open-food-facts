"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/components/providers/translation-provider";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";

export function DemoUserBadge() {
  const { dictionary } = useTranslation();
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <Skeleton className="h-9 w-40" aria-hidden="true" />;
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary">{dictionary.user.demoBadge}</Badge>
      <span className="hidden text-sm text-muted-foreground sm:inline">
        <span className="sr-only">{dictionary.user.signedInAs} </span>
        {user.email}
      </span>
    </div>
  );
}
