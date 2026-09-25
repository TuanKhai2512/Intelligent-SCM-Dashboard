import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { AgingService } from './aging.service';
import { VehicleSummaryRepository } from './vehicle-summary.repository';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [PricingModule],
  controllers: [VehiclesController],
  providers: [VehicleSummaryRepository, VehiclesService, AgingService],
  exports: [VehicleSummaryRepository],
})
export class VehiclesModule {}
