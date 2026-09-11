import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSessionDto } from '@forza/shared';

describe('SessionsService', () => {
  let service: SessionsService;

  // Query builder mock: chainable + thenable (para los `select(..., {head:true})`
  // que se resuelven directamente con `await query`, sin `.single()`).
  const mockQuery: any = {
    select: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    order: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    single: jest.fn(),
    then: jest.fn(),
  };

  const mockSupabaseService = { db: { from: jest.fn() } };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
    mockQuery.neq.mockReturnThis();
    mockQuery.order.mockReturnThis();
    mockQuery.insert.mockReturnThis();
    mockQuery.update.mockReturnThis();
    mockSupabaseService.db.from.mockReturnValue(mockQuery);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  const baseDto: CreateSessionDto = {
    athlete_id:   'athlete-1',
    session_date: '2026-09-15',
    session_time: '16:00',
    location:     'Cancha La 70',
  };

  describe('create — límite de cupo del plan (FOR-62)', () => {
    it('no valida cupo cuando la sesión no tiene plan_id (sesión extra)', async () => {
      // count para session_number
      mockQuery.then.mockImplementationOnce((resolve: any) =>
        Promise.resolve({ count: 3 }).then(resolve),
      );
      mockQuery.single.mockResolvedValue({ data: { id: 'session-1' }, error: null });

      await service.create({ ...baseDto, plan_id: null });

      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('plans');
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('crea la sesión cuando el plan tiene cupo disponible', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { total_sessions: 8, is_active: true, is_frozen: false },
        error: null,
      });
      mockQuery.then.mockImplementationOnce((resolve: any) =>
        Promise.resolve({ count: 5 }).then(resolve), // 5 no canceladas de 8
      );
      mockQuery.then.mockImplementationOnce((resolve: any) =>
        Promise.resolve({ count: 5 }).then(resolve), // count para session_number
      );
      mockQuery.single.mockResolvedValueOnce({ data: { id: 'session-1' }, error: null });

      await service.create({ ...baseDto, plan_id: 'plan-1' });

      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('rechaza la sesión cuando el plan ya tiene todas sus clases agendadas', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { total_sessions: 8, is_active: true, is_frozen: false },
        error: null,
      });
      mockQuery.then.mockImplementationOnce((resolve: any) =>
        Promise.resolve({ count: 8 }).then(resolve), // 8 de 8 -> lleno
      );

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQuery.insert).not.toHaveBeenCalled();
    });

    it('rechaza si el plan está congelado', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { total_sessions: 8, is_active: true, is_frozen: true },
        error: null,
      });

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        'No se pueden agendar sesiones en un plan congelado',
      );
    });

    it('rechaza si el plan está inactivo', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { total_sessions: 8, is_active: false, is_frozen: false },
        error: null,
      });

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        'No se pueden agendar sesiones en un plan inactivo',
      );
    });

    it('rechaza si el plan no existe', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      await expect(service.create({ ...baseDto, plan_id: 'plan-inexistente' })).rejects.toThrow(
        'El plan indicado no existe',
      );
    });
  });
});
