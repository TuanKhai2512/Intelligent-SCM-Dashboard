import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FilterOptions, Paginated, VehicleView } from '@ims/shared';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
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
}
