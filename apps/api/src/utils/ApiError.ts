/**
 * Throw this anywhere in a route or service to send a clean error to the app:
 *   throw new ApiError(404, "NOT_FOUND", "Machine not found")
 * The error handler turns it into { success: false, error: { code, message } }.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, code = "BAD_REQUEST") {
    return new ApiError(400, code, message);
  }
  static unauthorized(message = "Please log in") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You are not allowed to do this") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(what = "Item") {
    return new ApiError(404, "NOT_FOUND", `${what} not found`);
  }
  static conflict(message: string, code = "CONFLICT") {
    return new ApiError(409, code, message);
  }
}
