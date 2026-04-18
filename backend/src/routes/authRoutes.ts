import express from "express";
import bcrypt from "bcryptjs";
import { findOrCreateUserFromOAuth, createJwtForUser } from "../services/authService";
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware";
import { db } from "../db/index";
import { User } from "../models/User";

const router = express.Router();

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// ──────────────────────────────────────────────
// POST /api/auth/register  (email + password)
// ──────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    // Check for duplicate email
    const existing = await new Promise<User | undefined>((resolve, reject) => {
      db.get<User>("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });

    if (existing) {
      res.status(409).json({ error: "An account with that email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = generateId();
    const now = new Date().toISOString();

    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO users (id, email, name, provider, providerId, passwordHash, createdAt, updatedAt)
         VALUES (?, ?, ?, 'email', ?, ?, ?, ?)`,
        [id, email, name, email, passwordHash, now, now],
        (err) => { if (err) reject(err); else resolve(); }
      );
    });

    const user: User = { id, email, name, provider: "email", providerId: email, createdAt: now, updatedAt: now };
    const token = createJwtForUser(user);
    res.status(201).json({ token, user: { id, email, name } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Register error", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/login  (OAuth OR email + password)
// ──────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { provider, providerId, email, name, password } = req.body ?? {};

  // ── Email + password branch ──
  if (email && password && !provider) {
    try {
      const user = await new Promise<User | undefined>((resolve, reject) => {
        db.get<User>(
          "SELECT * FROM users WHERE email = ? AND provider = 'email'",
          [email],
          (err, row) => { if (err) reject(err); else resolve(row); }
        );
      });

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = createJwtForUser(user);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Login error", err);
      res.status(500).json({ error: "Authentication failed" });
    }
    return;
  }

  // ── OAuth branch (demo + future providers) ──
  if (!provider || !providerId || !email || !name) {
    res.status(400).json({ error: "Missing required fields (provider, providerId, email, name) or (email, password)" });
    return;
  }

  try {
    const user = await findOrCreateUserFromOAuth({ provider, providerId, email, name });
    const token = createJwtForUser(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Auth error", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// ──────────────────────────────────────────────
// GET /api/auth/me
// ──────────────────────────────────────────────
router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }

  db.get<User>(
    "SELECT id, email, name, provider, providerId, createdAt, updatedAt FROM users WHERE id = ?",
    [userId],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: "Failed to load user" });
        return;
      }

      if (!row) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ id: row.id, email: row.email, name: row.name });
    }
  );
});

export default router;
