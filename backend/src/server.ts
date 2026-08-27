import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import uploadRoutes from "./routes/uploads";
import gameRoutes from "./routes/games";
import analyzeRoutes from "./routes/analyze";
import buildRoutes from "./routes/build";
import adminRoutes from "./routes/admin";
import { auth } from "./lib/auth";

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
