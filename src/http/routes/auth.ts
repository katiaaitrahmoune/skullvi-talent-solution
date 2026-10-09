import { Router } from "express";
import { z } from "zod";
import { login } from "../../services/users.ts";
import { currentUser, requireAuth } from "../middleware/auth.ts";
import { loginLimiter } from "../middleware/limits.ts";

export const authRouter = Router();

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = z.object({ email: z.string().max(200), password: z.string().max(200) }).parse(req.body);
  res.json(await login(email, password)); // { token, user } - send the token as "Authorization: Bearer <token>"
});

authRouter.get("/me", requireAuth, (_req, res) => { res.json(currentUser(res)); });
