import { Test, TestingModule } from '@nestjs/testing';
import { FunctionsController } from './functions.controller';
import { FunctionsService } from './functions.service';

describe('Functions Controller', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [FunctionsController],
      providers: [FunctionsService],
    }).compile();
  });
  it('should be defined', () => {
    const controller: FunctionsController = module.get<FunctionsController>(FunctionsController);
    expect(controller).toBeDefined();
  });
});
