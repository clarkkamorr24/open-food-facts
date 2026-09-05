import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors";
import type { ApiResponse } from "../types/api";
import { logger } from "../utils/logger";

interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

function describeValidationIssues(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    message: issue.message,
  }));
}

function normalizePrismaError(
  error: Prisma.PrismaClientKnownRequestError
): NormalizedError {
  switch (error.code) {
    case "P2002":
      return {
        statusCode: 409,
        code: "RESOURCE_CONFLICT",
        message: "That resource already exists.",
      };
    case "P2025":
      return {
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Resource not found.",
      };
    default:
      return {
        statusCode: 500,
        code: "DATABASE_ERROR",
        message: "A database error occurred. Please try again.",
      };
  }
}

function normalize(error: unknown): NormalizedError {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "The request contains invalid parameters.",
      details: describeValidationIssues(error),
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return normalizePrismaError(error);
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return {
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
      message: "The service is temporarily unavailable. Please try again.",
    };
  }

  return {
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  };
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalized = normalize(error);

  if (normalized.statusCode >= 500) {
    logger.error("Unhandled request failure", {
      method: req.method,
      path: req.originalUrl,
      code: normalized.code,
      reason: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });
  } else {
    logger.warn("Request rejected", {
      method: req.method,
      path: req.originalUrl,
      statusCode: normalized.statusCode,
      code: normalized.code,
    });
  }

  const body: ApiResponse<never> = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
  };

  res.status(normalized.statusCode).json(body);
}

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiResponse<never> = {
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Cannot ${req.method} ${req.path}`,
    },
  };

  res.status(404).json(body);
}
