import { env } from "../../config/env";
import { userRepository } from "./user.repository";
import type { DemoUser } from "./user.types";

export const userService = {
  getDemoUser(): Promise<DemoUser> {
    return userRepository.findOrCreateByEmail(env.DEMO_USER_EMAIL);
  },
};
