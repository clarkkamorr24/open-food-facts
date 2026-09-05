import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request["params"];
      }

      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          configurable: true,
          writable: true,
        });
      }

      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
