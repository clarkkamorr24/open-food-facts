import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../../errors";
import type { ApiResponse } from "../../types/api";
import type { DemoUser } from "./user.types";

export const userController = {
  get(req: Request, res: Response, next: NextFunction): void {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const body: ApiResponse<DemoUser> = { success: true, data: user };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },
};
