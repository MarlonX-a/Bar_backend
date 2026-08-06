import type { Request } from 'express';

export interface AuthenticatedUser {
  idUser: number;
  correo: string;
  idRol: number;
}

export interface JwtPayload {
  sub: number;
  correo: string;
  idRol: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
