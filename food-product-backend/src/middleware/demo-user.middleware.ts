import type { NextFunction, Request, Response } from "express";

import { userService } from "../modules/users/user.service";

export async function withDemoUser(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.req.user = await userService.getDemoUser();
    next();
  } catch (error) {
    next(error);
  }
}
