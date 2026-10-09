import { rateLimit } from "express-rate-limit";

const json = (code: string, message: string) => ({ code, message });
export const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false, message: json("rate_limited", "Trop de tentatives. Réessayez dans quelques minutes.") });
export const applyLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: json("rate_limited", "Trop de candidatures envoyées depuis cette connexion. Réessayez plus tard.") });
