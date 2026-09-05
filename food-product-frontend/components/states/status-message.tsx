import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatusMessageProps {
  title: string;
  body: string;
  action?: ReactNode;
  tone?: "neutral" | "error";
}

export function StatusMessage({ title, body, action, tone = "neutral" }: StatusMessageProps) {
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center",
        isError ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"
      )}
    >
      <p
        className={cn(
          "text-sm font-medium",
          isError ? "text-destructive" : "text-foreground"
        )}
      >
        {isError ? <span aria-hidden="true">⚠ </span> : null}
        {title}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
