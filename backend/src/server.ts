import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.ts";
import uploadRoutes from "./routes/uploads.ts";
import gameRoutes from "./routes/games.ts";
import analyzeRoutes from "./routes/analyze.ts";
import buildRoutes from "./routes/build.ts";
import adminRoutes from "./routes/admin.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Better Auth : /api/auth/* (sign-in, sign-up, session, admin)
app.all("/api/auth/{*path}", toNodeHandler(auth));

app.use("/api/upload", uploadRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/build", buildRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
