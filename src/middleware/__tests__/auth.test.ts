import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { extractIdentity, requireAuth, requireWrite } from '../auth';
import { env } from '../../config/env';

const mockRes = () => {
  const res = {} as Response & { statusCode?: number; body?: unknown };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  return res;
};

describe('auth middleware', () => {
  it('extracts identity from Bearer JWT', () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.com' }, env.jwtSecret);
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const id = extractIdentity(req);
    expect(id.userId).toBe('u1');
    expect(id.email).toBe('a@b.com');
  });

  it('extracts identity and roles from gateway headers', () => {
    const req = {
      headers: {
        'x-user-id': 'u9', 'x-user-email': 'g@w.com', 'x-user-roles': 'admin,gestor',
      }
    } as unknown as Request;
    const id = extractIdentity(req);
    expect(id.userId).toBe('u9');
    expect(id.roles).toEqual(['admin', 'gestor']);
  });

  it('requireAuth rejects when no identity', () => {
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('requireWrite allows when roles absent and enforce=false', () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.com' }, env.jwtSecret);
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    requireWrite(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('extractIdentity returns empty identity for an invalid Bearer token', () => {
    const req = { headers: { authorization: 'Bearer not-a-jwt' } } as unknown as Request;
    const id = extractIdentity(req);
    expect(id.userId).toBeNull();
    expect(id.email).toBeNull();
    expect(id.roles).toEqual([]);
  });

  it('requireWrite returns 401 when there is no identity', () => {
    const req = { headers: {} } as unknown as Request;
    const next = jest.fn();
    requireWrite(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('requireWrite allows a user with a write role', () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.com', roles: ['gestor'] }, env.jwtSecret);
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const next = jest.fn();
    requireWrite(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('requireWrite denies a user whose roles lack admin/gestor', () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.com', roles: ['vendedor'] }, env.jwtSecret);
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const next = jest.fn();
    requireWrite(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});

describe('auth enforce mode', () => {
  const realEnforce = env.rbac.enforce;
  afterEach(() => { (env.rbac as { enforce: boolean }).enforce = realEnforce; });

  it('requireWrite denies when roles absent and enforce=true', () => {
    (env.rbac as { enforce: boolean }).enforce = true;
    const token = jwt.sign({ sub: 'u1', email: 'a@b.com' }, env.jwtSecret);
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const next = jest.fn();
    requireWrite(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});
