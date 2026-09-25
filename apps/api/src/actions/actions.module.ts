import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';

@Module({ imports: [PricingModule], controllers: [ActionsController], providers: [ActionsService] })
export class ActionsModule {}
