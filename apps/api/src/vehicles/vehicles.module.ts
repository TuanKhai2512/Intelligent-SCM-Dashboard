import { Module } from '@nestjs/common';
import { VehicleSummaryRepository } from './vehicle-summary.repository';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  controllers: [VehiclesController],
  providers: [VehicleSummaryRepository, VehiclesService],
  exports: [VehicleSummaryRepository],
})
export class VehiclesModule {}
