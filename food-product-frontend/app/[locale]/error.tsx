"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unhandled rendering error", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col items-center justify-center gap-3 px-4 text-center"
    >
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">Please try again.</p>
      <Button type="button" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
