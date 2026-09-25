import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ActionView, CreateActionResult } from '@ims/shared';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/create-action.dto';

@ApiTags('actions')
@ApiBearerAuth()
@Controller()
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Post('vehicles/:id/actions')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateActionDto,
  ): Promise<CreateActionResult> {
    return this.actions.create(user, id, dto);
  }

  @Get('vehicles/:id/actions')
  list(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ActionView[]> {
    return this.actions.list(user.dealershipId, id);
  }
}
