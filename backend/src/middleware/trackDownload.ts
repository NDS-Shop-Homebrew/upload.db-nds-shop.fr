import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

// Track les téléchargements de ROMs (.nds/.cia) dans la BDD
// ponytail: non bloquant — si la BDD est down, le téléchargement marche quand même
export async function trackDownload(req: Request, res: Response, next: NextFunction) {
  const file = req.params.file;
  if (!file || !/\.(nds|cia)$/i.test(file)) return next();
  try {
    const title = req.query.title as string | undefined;
    const userAgent = req.headers["user-agent"] || null;
    const ip = req.ip?.replace(/^::ffff:/, "") || null;
    await prisma.downloadLog.create({
      data: {
        game: file,
        title: title || undefined,
        userAgent: userAgent || undefined,
        ip: ip || undefined,
      },
    });
  } catch (err) {
    console.error("⚠️ Tracking download échoué:", err);
  } finally {
    next();
  }
}
