import type { DemoUser } from "../modules/users/user.types";

declare global {
  namespace Express {
    interface Request {
      user?: DemoUser;
    }
  }
}

export {};
