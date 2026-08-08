import type { Request } from 'express';

export interface AuthenticatedUser {
  idUser: number;
  correo: string;
  idRol: number;
  codigoRol: string;
  sid?: string;
  jti?: string;
}

export interface JwtPayload {
  sub: number;
  correo: string;
  codigoRol: string;
  iat?: number;
  exp?: number;
  sid?: string;
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
