import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            getSessionProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('devuelve el perfil de sesión con los permisos del rol', async () => {
    const user = { idUser: 1, codigoRol: 'WORKER' };
    const enriched = { ...user, permissions: ['PRODUCT_READ'] };
    const getSessionProfile = jest
      .spyOn(service, 'getSessionProfile')
      .mockResolvedValue(enriched as never);

    await expect(controller.profile({ user } as never)).resolves.toBe(enriched);
    expect(getSessionProfile).toHaveBeenCalledWith(user);
  });
});
