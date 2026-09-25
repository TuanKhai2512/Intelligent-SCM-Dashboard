import { Module } from '@nestjs/common';
import { VehicleSummaryRepository } from './vehicle-summary.repository';

@Module({
  providers: [VehicleSummaryRepository],
  exports: [VehicleSummaryRepository],
})
export class VehiclesModule {}
