import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { RolsService } from '../rols/rols.service';

describe('CatalogController', () => {
  let controller: CatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: {
            createCategory: jest.fn(),
            findCategories: jest.fn(),
            updateCategory: jest.fn(),
            removeCategory: jest.fn(),
            createProduct: jest.fn(),
            findProducts: jest.fn(),
            updateProduct: jest.fn(),
            findPublicMenu: jest.fn(),
          },
        },
        {
          provide: RolsService,
          useValue: { findByCodeWithPermissions: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });
});
