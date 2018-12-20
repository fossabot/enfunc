import { Module } from '@nestjs/common';
import { FunctionsService } from './functions.service';
import { FunctionsController } from './functions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FunctionSchema } from './schemas/function.schema';
import { RevisionSchema } from './schemas/revision.schema';

@Module({
  imports: [MongooseModule.forFeature([{
    name: 'Function',
    schema: FunctionSchema,
  }, {
    name: 'Revision',
    schema: RevisionSchema,
  }])],
  providers: [FunctionsService],
  controllers: [FunctionsController],
})
export class FunctionsModule { }
