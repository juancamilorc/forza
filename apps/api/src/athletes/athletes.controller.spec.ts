import { Test, TestingModule } from '@nestjs/testing';
import { AthletesController } from './athletes.controller';
import { AthletesService } from './athletes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAthleteDto, UpdateAthleteDto, AthleteStatus } from '@forza/shared';

describe('AthletesController', () => {
  let controller: AthletesController;
  let service: jest.Mocked<AthletesService>;

  const mockAthlete = {
    id: 'athlete-uuid-1',
    first_name: 'Juan',
    last_name: 'Pérez',
    birth_date: '2000-01-15',
    status: 'active',
    trainer_id: 'trainer-uuid-1',
    photo_url: null,
    notes: null,
    age: 26,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AthletesController],
      providers: [
        {
          provide: AthletesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            changeStatus: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AthletesController>(AthletesController);
    service = module.get(AthletesService);
  });

  describe('findAll', () => {
    it('should use user.trainer_id when user role is trainer', async () => {
      service.findAll.mockResolvedValue([mockAthlete]);
      const trainerUser = { role: 'trainer', trainer_id: 'trainer-uuid-1' };

      const result = await controller.findAll(trainerUser, undefined);

      expect(service.findAll).toHaveBeenCalledWith('trainer-uuid-1');
      expect(result).toEqual([mockAthlete]);
    });

    it('should use query param trainerId for admin user', async () => {
      service.findAll.mockResolvedValue([mockAthlete]);
      const adminUser = { role: 'admin' };

      await controller.findAll(adminUser, 'some-trainer-id');

      expect(service.findAll).toHaveBeenCalledWith('some-trainer-id');
    });

    it('should call findAll with undefined when admin provides no filter', async () => {
      service.findAll.mockResolvedValue([]);
      const adminUser = { role: 'admin' };

      await controller.findAll(adminUser, undefined);

      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should ignore query param trainerId for trainer role (uses own trainer_id)', async () => {
      service.findAll.mockResolvedValue([mockAthlete]);
      const trainerUser = { role: 'trainer', trainer_id: 'trainer-uuid-1' };

      await controller.findAll(trainerUser, 'other-trainer-id');

      expect(service.findAll).toHaveBeenCalledWith('trainer-uuid-1');
    });
  });

  describe('findOne', () => {
    it('should return an athlete by id', async () => {
      service.findOne.mockResolvedValue(mockAthlete);

      const result = await controller.findOne('athlete-uuid-1');

      expect(service.findOne).toHaveBeenCalledWith('athlete-uuid-1');
      expect(result).toEqual(mockAthlete);
    });
  });

  describe('create', () => {
    it('should create and return an athlete', async () => {
      const dto: CreateAthleteDto = {
        first_name: 'María',
        last_name: 'García',
        birth_date: '2000-01-15',
        status: AthleteStatus.ACTIVE,
      };
      const created = { ...mockAthlete, first_name: 'María', last_name: 'García' };
      service.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and return the athlete', async () => {
      const dto: UpdateAthleteDto = { first_name: 'Juan Updated' };
      const updated = { ...mockAthlete, first_name: 'Juan Updated' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update('athlete-uuid-1', dto);

      expect(service.update).toHaveBeenCalledWith('athlete-uuid-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('changeStatus', () => {
    it('should change the athlete status', async () => {
      const updated = { ...mockAthlete, status: 'inactive' };
      service.changeStatus.mockResolvedValue(updated);

      const result = await controller.changeStatus('athlete-uuid-1', 'inactive');

      expect(service.changeStatus).toHaveBeenCalledWith('athlete-uuid-1', 'inactive');
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should remove an athlete and return success message', async () => {
      const response = { message: 'Deportista eliminado correctamente' };
      service.remove.mockResolvedValue(response);

      const result = await controller.remove('athlete-uuid-1');

      expect(service.remove).toHaveBeenCalledWith('athlete-uuid-1');
      expect(result).toEqual(response);
    });
  });
});
