import type { ApiResponse } from "@/types/api";

import { ApiError } from "./api-error";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type QueryValue = string | number | undefined;

interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, API_BASE_URL);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, signal } = options;

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError("Unable to reach the server.", "NETWORK_ERROR", 0);
  }

  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!payload) {
    throw new ApiError(
      "The server returned an unreadable response.",
      "INVALID_RESPONSE",
      response.status
    );
  }

  if (!payload.success) {
    throw new ApiError(payload.error.message, payload.error.code, response.status);
  }

  return payload.data;
}
