"use client";

import { useState, type FormEvent } from "react";

import { useTranslation } from "@/components/providers/translation-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN_QUERY_LENGTH = 2;

interface SearchFormProps {
  initialQuery?: string;
  isSearching: boolean;
  onSubmit: (query: string) => void;
}

export function SearchForm({ initialQuery = "", isSearching, onSubmit }: SearchFormProps) {
  const { dictionary } = useTranslation();
  const [value, setValue] = useState(initialQuery);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = value.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setError(dictionary.search.minLength);
      return;
    }

    setError(null);
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <label htmlFor="product-search" className="mb-2 block text-sm font-medium">
        {dictionary.search.label}
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="product-search"
          name="q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={dictionary.search.placeholder}
          aria-invalid={error !== null}
          aria-describedby={error ? "product-search-error" : undefined}
          autoComplete="off"
          className="h-10 flex-1"
        />

        <Button type="submit" size="lg" disabled={isSearching}>
          {isSearching ? dictionary.search.searching : dictionary.search.submit}
        </Button>
      </div>

      {error ? (
        <p id="product-search-error" role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
