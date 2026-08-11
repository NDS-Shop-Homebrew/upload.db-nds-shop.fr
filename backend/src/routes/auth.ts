import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma.ts";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "super-secret";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives, réessayez dans 15 minutes" },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ message: "Identifiants invalides" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ message: "Identifiants invalides" });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
    expiresIn: "1h",
  });

  res.json({ token });
});

router.get("/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Non autorisé" });

  try {
    const token = auth.split(" ")[1];
    const decoded: any = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true },
    });

    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json(user);
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
});

export default router;
