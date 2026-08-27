import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      user?: typeof auth.$Infer.Session.user;
      session?: typeof auth.$Infer.Session.session;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session invalide ou expirée" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const role = (session.user as any).role;
    if (role !== "admin" && role !== "super-admin") {
      return res.status(403).json({ message: "Accès réservé aux administrateurs" });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session invalide ou expirée" });
  }
}