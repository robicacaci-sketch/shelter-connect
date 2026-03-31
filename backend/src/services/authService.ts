import jwt from "jsonwebtoken";
import { db } from "../db/index";
import { User } from "../models/User";
import { JWT_SECRET } from "../config";

interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  name: string;
}

const nowIso = () => new Date().toISOString();

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const findOrCreateUserFromOAuth = (
  profile: OAuthProfile
): Promise<User> => {
  const { provider, providerId, email, name } = profile;

  return new Promise<User>((resolve, reject) => {
    db.get<User>(
      "SELECT * FROM users WHERE provider = ? AND providerId = ?",
      [provider, providerId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          resolve(row);
          return;
        }

        const id = generateId();
        const createdAt = nowIso();
        const updatedAt = createdAt;

        db.run(
          `
            INSERT INTO users (id, email, name, provider, providerId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [id, email, name, provider, providerId, createdAt, updatedAt],
          (insertErr) => {
            if (insertErr) {
              reject(insertErr);
              return;
            }

            resolve({
              id,
              email,
              name,
              provider,
              providerId,
              createdAt,
              updatedAt
            });
          }
        );
      }
    );
  });
};

export const createJwtForUser = (user: User): string => {
  const payload = { sub: user.id, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
};

export const verifyJwt = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
  return { userId: decoded.sub };
};

