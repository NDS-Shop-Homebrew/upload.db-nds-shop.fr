import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();
const SECRET = "super-secret";

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
    expiresIn: "1h",
  });
  res.json({ token });
});

// Profil
router.get("/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Unauthorized" });

  try {
    const token = auth.split(" ")[1];
    const decoded: any = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    res.json({ id: user?.id, username: user?.username, role: user?.role });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
