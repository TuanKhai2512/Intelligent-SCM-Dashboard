import type { Role } from '@ims/shared';

export interface AuthUser {
  id: string;
  role: Role;
  dealershipId: string;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  dealershipId: string;
}
