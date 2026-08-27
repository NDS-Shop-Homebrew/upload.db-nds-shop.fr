import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export async function trackDownload(req: Request, res: Response, next: NextFunction) {
  const file = req.params.file;
  if (!file || !/\.(nds|cia)$/i.test(file)) return next();

  next();

  try {
    const title = (req.query.title as string) || undefined;
    const userAgent = (req.headers["user-agent"] as string) || undefined;
    
    // Récupère l'IP réelle derrière Nginx ou Cloudflare
    const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || undefined;
    const ip = rawIp ? rawIp.replace(/^::ffff:/, "") : undefined;

    await prisma.downloadLog.create({
      data: {
        game: file,
        title,
        userAgent,
        ip,
      },
    });
  } catch (err) {
    console.error("⚠️ Tracking download échoué (non bloquant):", err);
  }
}