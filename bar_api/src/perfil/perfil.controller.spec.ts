import { Test, TestingModule } from '@nestjs/testing';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';
import { RolsService } from '../rols/rols.service';

describe('PerfilController', () => {
  let controller: PerfilController;
  let service: PerfilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerfilController],
      providers: [
        {
          provide: PerfilService,
          useValue: {
            create: jest.fn(),
            findMine: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: RolsService,
          useValue: { findByCodeWithPermissions: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<PerfilController>(PerfilController);
    service = module.get<PerfilService>(PerfilService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('resuelve el perfil propio a partir del usuario autenticado', async () => {
    const perfil = { idPerfil: 7 };
    const findMine = jest.spyOn(service, 'findMine').mockResolvedValue(perfil as never);

    const request = { user: { idUser: 42 } } as never;
    await expect(controller.findMine(request)).resolves.toBe(perfil);
    expect(findMine).toHaveBeenCalledWith(42);
  });
});
