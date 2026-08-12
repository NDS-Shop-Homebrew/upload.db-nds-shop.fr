import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.ts";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers as Headers });
  if (!session) return res.status(401).json({ message: "Non autorisé" });
  (req as any).user = session.user;
  (req as any).session = session;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers as Headers });
  if (!session) return res.status(401).json({ message: "Non autorisé" });
  const role = (session.user as any).role;
  if (role !== "admin") return res.status(403).json({ message: "Accès réservé à l'admin" });
  (req as any).user = session.user;
  (req as any).session = session;
  next();
}
