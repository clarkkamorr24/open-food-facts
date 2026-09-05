import { Router } from "express";

import { withDemoUser } from "../../middleware/demo-user.middleware";
import { userController } from "./user.controller";

export const userRoutes = Router();

userRoutes.get("/", withDemoUser, userController.get);
