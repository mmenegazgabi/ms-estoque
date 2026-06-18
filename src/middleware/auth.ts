import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, WRITE_ROLES } from '../config/env';
import { AuthIdentity } from '../domain/types';
import { forbidden, unauthorized } from './errorHandler';

const headerValue = (req: Request, name: string): string | null => {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0] ?? null;
  return typeof v === 'string' ? v : null;
};

const parseRoles = (raw: string | string[] | null | undefined): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return raw.split(',').map((r) => r.trim()).filter(Boolean);
};

export function extractIdentity(req: Request): AuthIdentity {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), env.jwtSecret) as Record<string, unknown>;
      return {
        userId: (payload.sub as string) ?? null,
        email: (payload.email as string) ?? null,
        roles: parseRoles(payload[env.rbac.rolesClaim] as string | string[] | undefined),
      };
    } catch {
      return { userId: null, email: null, roles: [] };
    }
  }
  // Claims forwarded by API Gateway
  const userId = headerValue(req, env.rbac.userIdHeader);
  const email = headerValue(req, env.rbac.userEmailHeader);
  const roles = parseRoles(headerValue(req, env.rbac.rolesHeader));
  return { userId, email, roles };
}

declare module 'express-serve-static-core' {
  interface Request {
    identity?: AuthIdentity;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const id = extractIdentity(req);
  if (!id.userId && !id.email) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  req.identity = id;
  next();
}

export function requireWrite(req: Request, _res: Response, next: NextFunction) {
  const id = req.identity ?? extractIdentity(req);
  req.identity = id;
  if (!id.userId && !id.email) return next(unauthorized());
  if (id.roles.length === 0) {
    // Degrade gracefully: allow writes when no roles available unless enforcing
    if (env.rbac.enforce) return next(forbidden('Roles ausentes; escrita requer admin/gestor'));
    return next();
  }
  if (id.roles.some((r) => WRITE_ROLES.includes(r))) return next();
  return next(forbidden('Escrita requer perfil admin ou gestor'));
}
