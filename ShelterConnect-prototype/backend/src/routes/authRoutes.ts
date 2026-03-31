import express from "express";
import { findOrCreateUserFromOAuth, createJwtForUser } from "../services/authService";
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware";
import { db } from "../db/index";
import { User } from "../models/User";

const router = express.Router();

// Simplified OAuth login endpoint.
// Expects provider-verified profile and returns a JWT.
router.post("/login", async (req, res) => {
  const { provider, providerId, email, name } = req.body ?? {};

  if (!provider || !providerId || !email || !name) {
    res.status(400).json({ error: "Missing required OAuth profile fields" });
    return;
  }

  try {
    const user = await findOrCreateUserFromOAuth({
      provider,
      providerId,
      email,
      name
    });
    const token = createJwtForUser(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Auth error", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Returns the current authenticated user.
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

