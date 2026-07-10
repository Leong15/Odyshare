import { Request, Response, NextFunction } from "express";
import { verifySessionDetailed } from "../utils/session.js";
import { fail } from "../utils/apiResponse.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token = "";
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json(fail("UNAUTHORIZED", "Missing or invalid authorization token (未提供有效登入驗證憑證)。"));
  }

  const result = verifySessionDetailed(token);
  if (result.error === "SESSION_EXPIRED") {
    return res.status(401).json(fail("SESSION_EXPIRED", "Session expired. Please sign in again (登入已逾期，請重新登入)。"));
  }
  if (result.error === "INVALID" || !result.userId) {
    return res.status(401).json(fail("UNAUTHORIZED", "Session invalid. Please sign in again (登入憑證無效，請重新登入)。"));
  }

  (req as any).userId = result.userId;
  next();
}
