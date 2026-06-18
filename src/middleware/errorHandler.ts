import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const notFound = (msg = 'Recurso não encontrado') => new AppError(404, msg);
export const conflict = (msg: string) => new AppError(409, msg);
export const forbidden = (msg = 'Acesso negado') => new AppError(403, msg);
export const unauthorized = (msg = 'Não autenticado') => new AppError(401, msg);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', details: err.flatten() });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // Unique violation from Postgres
  if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
    return res.status(409).json({ error: 'Registro duplicado' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Erro interno' });
}
