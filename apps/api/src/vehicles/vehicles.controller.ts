import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AgingReport, FilterOptions, Paginated, Suggestion, VehicleDetail, VehicleView } from '@ims/shared';
import type { Response } from 'express';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { AgingService } from './aging.service';
import { CloseVehicleDto } from './dto/close-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { toVehicleView } from './vehicle.mapper';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly agingService: AgingService,
  ) {}

  // Static routes first; `:id` routes go at the bottom of this class.

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: VehicleQueryDto): Promise<Paginated<VehicleView>> {
    return this.vehicles.list(user.dealershipId, q);
  }

  @Get('filters')
  filters(@CurrentUser() user: AuthUser): Promise<FilterOptions> {
    return this.vehicles.filterOptions(user.dealershipId);
  }

  @Get('export.csv')
  async export(
    @CurrentUser() user: AuthUser,
    @Query() q: VehicleQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { filename, body } = await this.vehicles.exportCsv(user.dealershipId, q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return body;
  }

  @Get('aging')
  aging(@CurrentUser() user: AuthUser): Promise<AgingReport> {
    return this.agingService.report(user.dealershipId);
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

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleDetail> {
    return this.vehicles.update(user.dealershipId, user.id, id, dto);
  }

  @Post(':id/sell')
  @HttpCode(200)
  sell(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CloseVehicleDto) {
    return this.vehicles.close(user.dealershipId, id, dto, 'SOLD');
  }

  @Post(':id/wholesale')
  @HttpCode(200)
  wholesale(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CloseVehicleDto) {
    return this.vehicles.close(user.dealershipId, id, dto, 'WHOLESALED');
  }
}
