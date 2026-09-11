import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: jest.Mocked<PaymentsService>;

  const mockPayment = { id: 'payment-1', athlete_id: 'athlete-1', amount: 100000 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            findAll: jest.fn(),
            findAllForTrainer: jest.fn(),
            getTrainerIdByUserId: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            addPayment: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get(PaymentsService);
  });

  describe('findAll — FOR-63', () => {
    it('usa findAllForTrainer y su propio trainer_id cuando el rol es trainer', async () => {
      service.getTrainerIdByUserId.mockResolvedValue('trainer-1');
      service.findAllForTrainer.mockResolvedValue([mockPayment] as any);
      const trainerUser = { role: 'trainer', id: 'user-1' };

      const result = await controller.findAll(trainerUser, undefined);

      expect(service.getTrainerIdByUserId).toHaveBeenCalledWith('user-1');
      expect(service.findAllForTrainer).toHaveBeenCalledWith('trainer-1', undefined);
      expect(service.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockPayment]);
    });

    it('devuelve [] si el trainer no tiene perfil en trainers', async () => {
      service.getTrainerIdByUserId.mockResolvedValue(null);
      const trainerUser = { role: 'trainer', id: 'user-1' };

      const result = await controller.findAll(trainerUser, undefined);

      expect(service.findAllForTrainer).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('usa findAll (sin filtrar) para admin', async () => {
      service.findAll.mockResolvedValue([mockPayment] as any);
      const adminUser = { role: 'admin' };

      const result = await controller.findAll(adminUser, 'athlete-1');

      expect(service.findAll).toHaveBeenCalledWith('athlete-1');
      expect(service.findAllForTrainer).not.toHaveBeenCalled();
      expect(result).toEqual([mockPayment]);
    });
  });
});
