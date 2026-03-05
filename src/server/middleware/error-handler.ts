import { createMiddleware } from "hono/factory";
import type { Env } from "../env";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Unhandled error:", error);

    if (error instanceof AppError) {
      return c.json(
        { error: error.code, error_description: error.message },
        error.status as 400,
      );
    }

    return c.json(
      { error: "server_error", error_description: "An unexpected error occurred." },
      500,
    );
  }
});
