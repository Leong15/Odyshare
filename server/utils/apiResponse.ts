import { ApiSuccess, ApiError, ApiResponse } from "../../src/shared/apiTypes.js";

export type { ApiSuccess, ApiError, ApiResponse };

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(code: string, message: string): ApiError {
  return { success: false, error: { code, message } };
}
