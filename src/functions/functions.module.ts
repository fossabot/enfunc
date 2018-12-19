import { Module } from '@nestjs/common';
import { FunctionsService } from './functions.service';
import { FunctionsController } from './functions.controller';

@Module({
  providers: [FunctionsService],
  controllers: [FunctionsController]
})
export class FunctionsModule {}
