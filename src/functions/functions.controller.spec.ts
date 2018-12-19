import { Test, TestingModule } from '@nestjs/testing';
import { FunctionsController } from './functions.controller';

describe('Functions Controller', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [FunctionsController],
    }).compile();
  });
  it('should be defined', () => {
    const controller: FunctionsController = module.get<FunctionsController>(FunctionsController);
    expect(controller).toBeDefined();
  });
});
