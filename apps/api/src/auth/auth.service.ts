import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUserView, LoginResult } from '@ims/shared';
import * as bcrypt from 'bcryptjs';
import type { JwtPayload } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const employee = await this.prisma.employee.findUnique({ where: { email: email.toLowerCase() } });
    const ok = employee?.active && (await bcrypt.compare(password, employee.passwordHash));
    if (!employee || !ok) throw new UnauthorizedException('Invalid email or password');

    const payload: JwtPayload = { sub: employee.id, role: employee.role, dealershipId: employee.dealershipId };
    return { accessToken: await this.jwt.signAsync(payload) };
  }

  async me(employeeId: string): Promise<AuthUserView> {
    const e = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!e || !e.active) throw new UnauthorizedException('Account is not active');
    return { id: e.id, fullName: e.fullName, email: e.email, role: e.role, dealershipId: e.dealershipId };
  }
}
