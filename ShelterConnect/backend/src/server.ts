import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { initDb } from "./db/index";
import authRoutes from "./routes/authRoutes";
import clientRoutes from "./routes/clientRoutes";
import evaluateRoutes from "./routes/evaluateRoutes";
import documentRouter from "./routes/documentRoutes";

dotenv.config();

// Create required directories before opening DB or files
const uploadsDir = path.join(__dirname, "../uploads");
const tmpDir = path.join(__dirname, "../uploads/tmp");
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

initDb();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/clients/:clientId/documents", documentRouter);
app.use("/api/evaluate", evaluateRoutes);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on port ${port}`);
});
