import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FilterOptions, Paginated, Suggestion, VehicleDetail, VehicleView } from '@ims/shared';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { toVehicleView } from './vehicle.mapper';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  // Static routes first; `:id` routes go at the bottom of this class.

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: VehicleQueryDto): Promise<Paginated<VehicleView>> {
    return this.vehicles.list(user.dealershipId, q);
  }

  @Get('filters')
  filters(@CurrentUser() user: AuthUser): Promise<FilterOptions> {
    return this.vehicles.filterOptions(user.dealershipId);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<VehicleDetail> {
    return this.vehicles.detail(user.dealershipId, id);
  }

  @Get(':id/suggestions')
  async suggestions(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Suggestion[]> {
    return toVehicleView(await this.vehicles.findRowOrThrow(user.dealershipId, id)).suggestions;
  }
}
