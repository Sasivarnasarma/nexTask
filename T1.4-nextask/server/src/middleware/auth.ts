// server/src/middleware/auth.ts
// This file is also used by TSOA as the `authenticationModule`.

import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";

// Augment Express Request so controllers can read req.user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── TSOA Authentication Handler ─────────────────────────────────────────────
// TSOA calls this when a route is decorated with @Security("BearerAuth")

export async function expressAuthentication(
  request: Request,
  securityName: string,
  _scopes?: string[]
): Promise<JwtPayload> {
  if (securityName !== "BearerAuth") {
    throw { status: 401, message: "Unknown security scheme" };
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Missing or malformed Authorization header" };
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    request.user = payload;
    return payload;
  } catch {
    throw { status: 401, message: "Invalid or expired token" };
  }
}

// ─── Plain Express Middleware (for non-TSOA use) ──────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const payload = verifyToken(authHeader.slice(7));
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Middleware that blocks routes for users whose mustResetPassword flag is set.
 * Call this AFTER requireAuth on any route that should be inaccessible
 * until the user changes their password.
 */
export function blockIfMustReset(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.mustReset) {
    res.status(403).json({
      message:
        "You must reset your password before accessing this resource.",
      code: "MUST_RESET_PASSWORD",
    });
    return;
  }
  next();
}
