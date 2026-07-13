import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'NODE_ENV' ? 'test' : undefined),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('metadata', () => {
    it('returns public service metadata', () => {
      expect(appController.getMetadata()).toEqual({
        name: '@itmarket/api',
        version: '0.0.1',
        apiVersion: 'v1',
        environment: 'test',
        status: 'ok',
        releaseSha: null,
      });
    });
  });
});
