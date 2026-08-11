import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "super-secret";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Non autorisé" });
  try {
    const token = auth.split(" ")[1];
    const decoded: any = jwt.verify(token, SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
}
