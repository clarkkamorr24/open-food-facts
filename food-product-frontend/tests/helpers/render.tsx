import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { TranslationProvider } from "@/components/providers/translation-provider";
import en from "@/i18n/dictionaries/en.json";
import type { Dictionary } from "@/i18n/types";

export const dictionary = en as Dictionary;

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TranslationProvider dictionary={dictionary} locale="en">
          {children}
        </TranslationProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
