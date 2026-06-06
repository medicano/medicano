import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeocodingService } from './common/geocoding/geocoding.service';

const mockGeocodingService = { getLocationByIp: jest.fn().mockResolvedValue(null) };

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: GeocodingService, useValue: mockGeocodingService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
