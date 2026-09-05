import { Router } from "express";

import { productRoutes } from "../modules/products/product.routes";
import { searchRoutes } from "../modules/searches/search.routes";
import { subscriptionRoutes } from "../modules/subscriptions/subscription.routes";
import { userRoutes } from "../modules/users/user.routes";

export const apiRoutes = Router();

apiRoutes.use("/products", productRoutes);
apiRoutes.use("/searches", searchRoutes);
apiRoutes.use("/subscription", subscriptionRoutes);
apiRoutes.use("/me", userRoutes);
