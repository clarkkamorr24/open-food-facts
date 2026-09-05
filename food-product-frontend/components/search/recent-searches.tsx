"use client";

import { useTranslation } from "@/components/providers/translation-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentSearches } from "@/hooks/use-recent-searches";

interface RecentSearchesProps {
  onSelect: (query: string) => void;
}

export function RecentSearches({ onSelect }: RecentSearchesProps) {
  const { dictionary } = useTranslation();
  const { searches, isLoading } = useRecentSearches();

  return (
    <section aria-labelledby="recent-searches-heading" className="w-full">
      <h2 id="recent-searches-heading" className="mb-2 text-sm font-medium">
        {dictionary.search.recentTitle}
      </h2>

      {isLoading ? (
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-24 rounded-4xl" />
          ))}
        </div>
      ) : searches.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dictionary.search.recentEmpty}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {searches.map((search) => (
            <li key={search.id}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelect(search.query)}
              >
                {search.query}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
