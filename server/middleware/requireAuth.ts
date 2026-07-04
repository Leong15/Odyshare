import { Request, Response, NextFunction } from "express";
import { verifySession } from "../utils/session.js";
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

  const userId = verifySession(token);
  if (!userId) {
    return res.status(401).json(fail("UNAUTHORIZED", "Session expired or invalid. Please sign in again (登入逾期或憑證無效，請重新登入)。"));
  }

  (req as any).userId = userId;
  next();
}
