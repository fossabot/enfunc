import { Module } from '@nestjs/common';
import { FunctionsService } from './functions.service';
import { FunctionsController } from './functions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FunctionSchema } from './schemas/function.schema';

@Module({
  imports: [MongooseModule.forFeature([{
    name: 'Function', schema: FunctionSchema,
  }])],
  providers: [FunctionsService],
  controllers: [FunctionsController],
})
export class FunctionsModule { }
