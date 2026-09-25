import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { validateEnv } from './config/env';
import { HealthModule } from './health/health.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: ['../../.env'] }),
    PrismaModule,
    CommonModule,
    AuthModule,
    HealthModule,
    PricingModule,
    VehiclesModule,
  ],
})
export class AppModule {}
