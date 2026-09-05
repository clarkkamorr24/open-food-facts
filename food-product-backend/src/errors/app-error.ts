export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "The request is invalid", code = "BAD_REQUEST") {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required", code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource", code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code = "NOT_FOUND") {
    super(message, 404, code);
  }
}

export class ValidationError extends AppError {
  constructor(message = "The request payload failed validation") {
    super(message, 422, "VALIDATION_ERROR");
  }
}

export class BadGatewayError extends AppError {
  constructor(message = "An upstream service is unavailable", code = "BAD_GATEWAY") {
    super(message, 502, code);
  }
}
