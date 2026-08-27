import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import fs from "fs";
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
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

// ----------------------------------------------------------------------
// 1. CORS CONFIGURATION (Dev vs Prod)
// ----------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://upload.db-nds-shop.fr",
  "https://db-nds-shop.fr",
  "http://localhost:5173", // Vite Frontend (Upload)
  "http://localhost:3000", // Main Website Frontend
  "http://localhost:3002", // This backend
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // DEV: Accept requests with no origin (curl, Postman) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // PROD: Strictly reject unauthorized origins
      if (isProd) {
        return callback(new Error(`CORS blocked for origin: ${origin}`), false);
      }

      // DEV: Fallback
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "x-requested-with"],
  })
);

// ----------------------------------------------------------------------
// 2. STATIC ASSETS SERVING (Dev & Prod Fallback)
// ----------------------------------------------------------------------
const MEDIA_PATH =
  process.env.MEDIA_STORAGE_PATH ||
  path.resolve(process.cwd(), "../../storage/assets");

if (!fs.existsSync(MEDIA_PATH)) {
  fs.mkdirSync(MEDIA_PATH, { recursive: true });
}
app.use("/assets", express.static(MEDIA_PATH));

// ----------------------------------------------------------------------
// 3. AUTHENTICATION (Better-Auth)
// ----------------------------------------------------------------------
app.all("/api/auth/*path", toNodeHandler(auth));

// ----------------------------------------------------------------------
// 4. PARSERS & LOGS
// ----------------------------------------------------------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan(isProd ? "combined" : "dev"));

// ----------------------------------------------------------------------
// 5. API ROUTES
// ----------------------------------------------------------------------
app.use("/api/upload", uploadRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/build", buildRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running [${isProd ? "PROD" : "DEV"}] on http://localhost:${PORT}`);
  console.log(`📁 Assets directory: ${MEDIA_PATH}`);
});