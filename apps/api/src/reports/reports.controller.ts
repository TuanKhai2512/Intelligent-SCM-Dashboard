import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ActionStatusCount, BucketCount, OverviewReport } from '@ims/shared';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser): Promise<OverviewReport> {
    return this.reports.overview(user.dealershipId);
  }

  @Get('age-distribution')
  ageDistribution(@CurrentUser() user: AuthUser): Promise<BucketCount[]> {
    return this.reports.ageDistribution(user.dealershipId);
  }

  @Get('aging-actions')
  agingActions(@CurrentUser() user: AuthUser): Promise<ActionStatusCount[]> {
    return this.reports.agingActions(user.dealershipId);
  }
}
