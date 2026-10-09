import type { RequestHandler, Response } from "express";
import type { AuthUser, Role } from "../../services/context.ts";
import { userFromToken } from "../../services/users.ts";
import { HttpError, forbidden } from "../errors.ts";

export const currentUser = (res: Response) => res.locals.user as AuthUser;

export const requireAuth: RequestHandler = async (req, res, next) => {
  const h = req.headers.authorization ?? "";
  const user = h.startsWith("Bearer ") ? await userFromToken(h.slice(7)) : null;
  if (!user) throw new HttpError(401, "unauthorized", "Connexion requise.");
  res.locals.user = user;
  next();
};

export const requireRole = (role: Role): RequestHandler => (_req, res, next) => {
  if (currentUser(res).role !== role) throw forbidden("Réservé à l'administration.");
  next();
};
