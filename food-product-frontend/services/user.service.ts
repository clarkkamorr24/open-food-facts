import { apiRequest } from "@/lib/api-client";
import type { DemoUser } from "@/types/user";

export const userService = {
  getCurrentUser(signal?: AbortSignal): Promise<DemoUser> {
    return apiRequest<DemoUser>("/api/me", { signal });
  },
};
