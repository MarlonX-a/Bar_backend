import type { Request } from 'express';

export interface AuthenticatedUser {
  idUser: number;
  correo: string;
  idRol: number;
  codigoRol: string;
  sid: string;
  jti: string;
}

export interface JwtPayload {
  sub: number;
  correo: string;
  codigoRol: string;
  sid: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
