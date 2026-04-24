import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AthletesService } from './athletes.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAthleteDto, UpdateAthleteDto, AthleteStatus } from '@forza/shared';

describe('AthletesService', () => {
  let service: AthletesService;

  const mockQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    single: jest.fn(),
    then: jest.fn(),
  };

  const mockSupabaseService = {
    db: {
      from: jest.fn(),
    },
  };

  const mockAthleteRow = {
    id: 'athlete-uuid-1',
    first_name: 'Juan',
    last_name: 'Pérez',
    birth_date: '2000-01-15',
    status: 'active',
    trainer_id: 'trainer-uuid-1',
    photo_url: null,
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-23'));

    jest.resetAllMocks();

    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
    mockQuery.order.mockReturnThis();
    mockQuery.insert.mockReturnThis();
    mockQuery.update.mockReturnThis();
    mockQuery.delete.mockReturnThis();
    mockSupabaseService.db.from.mockReturnValue(mockQuery);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AthletesService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<AthletesService>(AthletesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findAll', () => {
    it('should return all athletes with calculated age', async () => {
      mockQuery.then.mockImplementation((resolve: any) =>
        Promise.resolve({ data: [mockAthleteRow], error: null }).then(resolve),
      );

      const result = await service.findAll();

      expect(mockSupabaseService.db.from).toHaveBeenCalledWith('athletes');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'athlete-uuid-1', age: 26 });
    });

    it('should not apply eq filter when trainerId is not provided', async () => {
      mockQuery.then.mockImplementation((resolve: any) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
      );

      await service.findAll();

      expect(mockQuery.eq).not.toHaveBeenCalled();
    });

    it('should filter by trainerId when provided', async () => {
      mockQuery.then.mockImplementation((resolve: any) =>
        Promise.resolve({ data: [mockAthleteRow], error: null }).then(resolve),
      );

      await service.findAll('trainer-uuid-1');

      expect(mockQuery.eq).toHaveBeenCalledWith('trainer_id', 'trainer-uuid-1');
    });

    it('should throw BadRequestException on database error', async () => {
      mockQuery.then.mockImplementation((resolve: any) =>
        Promise.resolve({ data: null, error: { message: 'Connection refused' } }).then(resolve),
      );

      await expect(service.findAll()).rejects.toThrow(BadRequestException);
    });

    it('should calculate age correctly (birthday already passed this year)', async () => {
      const athlete = { ...mockAthleteRow, birth_date: '2000-01-15' };
      mockQuery.then.mockImplementation((resolve: any) =>
        Promise.resolve({ data: [athlete], error: null }).then(resolve),
      );

      const result = await service.findAll();
      expect(result[0].age).toBe(26);
    });

    it('should calculate age correctly (birthday not yet passed this year)', async () => {
      const athlete = { ...mockAthleteRow, birth_date: '2000-06-15' };
      mockQuery.then.mockImplementation((resolve: any) =>
        Promise.resolve({ data: [athlete], error: null }).then(resolve),
      );

      const result = await service.findAll();
      expect(result[0].age).toBe(25);
    });
  });

  describe('findOne', () => {
    it('should return an athlete by id with calculated age', async () => {
      mockQuery.single.mockResolvedValue({ data: mockAthleteRow, error: null });

      const result = await service.findOne('athlete-uuid-1');

      expect(mockSupabaseService.db.from).toHaveBeenCalledWith('athletes');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'athlete-uuid-1');
      expect(result).toMatchObject({ id: 'athlete-uuid-1', age: 26 });
    });

    it('should throw NotFoundException when supabase returns an error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when data is null', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Deportista nonexistent-id no encontrado',
      );
    });
  });

  describe('create', () => {
    const createDto: CreateAthleteDto = {
      first_name: 'María',
      last_name: 'García',
      birth_date: '2000-01-15',
      trainer_id: 'trainer-uuid-1',
      status: AthleteStatus.ACTIVE,
    };

    it('should create an athlete and return it with calculated age', async () => {
      const createdRow = { ...mockAthleteRow, first_name: 'María', last_name: 'García' };
      mockQuery.single.mockResolvedValue({ data: createdRow, error: null });

      const result = await service.create(createDto);

      expect(mockQuery.insert).toHaveBeenCalledWith({
        first_name: 'María',
        last_name: 'García',
        birth_date: '2000-01-15',
        trainer_id: 'trainer-uuid-1',
        status: 'active',
        notes: null,
      });
      expect(result).toMatchObject({ first_name: 'María', age: expect.any(Number) });
    });

    it('should default status to "trial" when not provided', async () => {
      const dtoWithoutStatus: CreateAthleteDto = {
        first_name: 'Carlos',
        last_name: 'López',
        birth_date: '2000-01-15',
      };
      mockQuery.single.mockResolvedValue({ data: mockAthleteRow, error: null });

      await service.create(dtoWithoutStatus);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'trial' }),
      );
    });

    it('should default trainer_id and notes to null when not provided', async () => {
      const minimalDto: CreateAthleteDto = {
        first_name: 'Carlos',
        last_name: 'López',
        birth_date: '2000-01-15',
      };
      mockQuery.single.mockResolvedValue({ data: mockAthleteRow, error: null });

      await service.create(minimalDto);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ trainer_id: null, notes: null }),
      );
    });

    it('should throw BadRequestException on database error', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Duplicate key' } });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateAthleteDto = { first_name: 'Juan Updated' };

    it('should update and return the athlete', async () => {
      const updatedRow = { ...mockAthleteRow, first_name: 'Juan Updated' };
      mockQuery.single
        .mockResolvedValueOnce({ data: mockAthleteRow, error: null })
        .mockResolvedValueOnce({ data: updatedRow, error: null });

      const result = await service.update('athlete-uuid-1', updateDto);

      expect(mockQuery.update).toHaveBeenCalledWith({ first_name: 'Juan Updated' });
      expect(result.first_name).toBe('Juan Updated');
      expect(result.age).toBe(26);
    });

    it('should throw NotFoundException if athlete does not exist', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(service.update('nonexistent-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when update query fails', async () => {
      mockQuery.single
        .mockResolvedValueOnce({ data: mockAthleteRow, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });

      await expect(service.update('athlete-uuid-1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove an athlete and return success message', async () => {
      mockQuery.single.mockResolvedValue({ data: mockAthleteRow, error: null });
      mockQuery.then.mockImplementation((resolve: any) =>
        Promise.resolve({ error: null }).then(resolve),
      );

      const result = await service.remove('athlete-uuid-1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'athlete-uuid-1');
      expect(result).toEqual({ message: 'Deportista eliminado correctamente' });
    });

    it('should throw NotFoundException if athlete does not exist', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when delete query fails', async () => {
      mockQuery.single.mockResolvedValue({ data: mockAthleteRow, error: null });
      mockQuery.then.mockImplementation((resolve: any) =>
        Promise.resolve({ error: { message: 'Delete failed' } }).then(resolve),
      );

      await expect(service.remove('athlete-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeStatus', () => {
    it('should update the athlete status and return updated data', async () => {
      const updatedRow = { ...mockAthleteRow, status: 'inactive' };
      mockQuery.single
        .mockResolvedValueOnce({ data: mockAthleteRow, error: null })
        .mockResolvedValueOnce({ data: updatedRow, error: null });

      const result = await service.changeStatus('athlete-uuid-1', 'inactive');

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'inactive' });
      expect(result.status).toBe('inactive');
    });

    it('should throw NotFoundException if athlete does not exist', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(service.changeStatus('nonexistent-id', 'inactive')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when status update fails', async () => {
      mockQuery.single
        .mockResolvedValueOnce({ data: mockAthleteRow, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });

      await expect(service.changeStatus('athlete-uuid-1', 'inactive')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
