import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSessionDto } from '@forza/shared';

describe('SessionsService', () => {
  let service: SessionsService;

  // Query builder mock: chainable + thenable (para los `select(..., {head:true})`
  // y los `select().eq()` sin `.single()` que se resuelven con `await query`).
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

  // Helpers para encolar resoluciones sucesivas de `await query` (count o data/error)
  const queueThen = (value: unknown) =>
    mockQuery.then.mockImplementationOnce((resolve: any) => Promise.resolve(value).then(resolve));

  const activePlan = { total_sessions: 8, is_active: true, is_frozen: false };
  const paid       = { data: [{ status: 'pagado' }], error: null };
  const partial    = { data: [{ status: 'parcial' }], error: null };
  const unpaid     = { data: [{ status: 'pendiente' }], error: null };
  const noPayments = { data: [], error: null };

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
    it('no valida cupo ni pago cuando la sesión no tiene plan_id (sesión extra)', async () => {
      queueThen({ count: 3 }); // count para session_number
      mockQuery.single.mockResolvedValue({ data: { id: 'session-1' }, error: null });

      await service.create({ ...baseDto, plan_id: null });

      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('plans');
      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('payments');
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('crea la sesión cuando el plan tiene cupo y pago registrado', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null }); // plan
      queueThen({ count: 5 });  // capacidad: 5 no canceladas de 8
      queueThen(partial);       // pago: parcial -> OK
      queueThen({ count: 5 });  // count para session_number
      mockQuery.single.mockResolvedValueOnce({ data: { id: 'session-1' }, error: null }); // insert

      await service.create({ ...baseDto, plan_id: 'plan-1' });

      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('rechaza la sesión cuando el plan ya tiene todas sus clases agendadas', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null });
      queueThen({ count: 8 }); // 8 de 8 -> lleno

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQuery.insert).not.toHaveBeenCalled();
    });

    it('rechaza si el plan está congelado', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...activePlan, is_frozen: true },
        error: null,
      });

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        'No se pueden agendar sesiones en un plan congelado',
      );
    });

    it('rechaza si el plan está inactivo', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...activePlan, is_active: false },
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

  describe('create — validación de pago antes de agendar (FOR-76)', () => {
    it('rechaza si el plan no tiene ningún pago pagado/parcial', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null });
      queueThen({ count: 2 });  // cupo libre
      queueThen(unpaid);        // solo 'pendiente'

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        'No se puede agendar ni confirmar sesiones sin un pago registrado para este plan',
      );
      expect(mockQuery.insert).not.toHaveBeenCalled();
    });

    it('rechaza si el plan no tiene ningún pago registrado', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null });
      queueThen({ count: 2 });
      queueThen(noPayments);

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('permite si el plan tiene al menos un pago pagado', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null });
      queueThen({ count: 2 });
      queueThen(paid);
      queueThen({ count: 2 }); // session_number
      mockQuery.single.mockResolvedValueOnce({ data: { id: 'session-1' }, error: null });

      await service.create({ ...baseDto, plan_id: 'plan-1' });

      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('confirmByTrainer — validación de pago (FOR-76)', () => {
    const sessionWithPlan = { id: 'session-1', plan_id: 'plan-1', reschedule_count: 0 };

    it('rechaza confirmar si el plan no tiene pago', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: sessionWithPlan, error: null }); // findOne
      queueThen(unpaid);

      await expect(service.confirmByTrainer('session-1')).rejects.toThrow(
        'No se puede agendar ni confirmar sesiones sin un pago registrado para este plan',
      );
      expect(mockQuery.update).not.toHaveBeenCalled();
    });

    it('permite confirmar si el plan tiene un pago parcial', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: sessionWithPlan, error: null });
      queueThen(partial);
      mockQuery.single.mockResolvedValueOnce({ data: { ...sessionWithPlan, status: 'completed' }, error: null });

      await service.confirmByTrainer('session-1');

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('no valida pago para una sesión extra (sin plan_id)', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: { id: 'session-1', plan_id: null }, error: null });
      mockQuery.single.mockResolvedValueOnce({ data: { id: 'session-1', status: 'completed' }, error: null });

      await service.confirmByTrainer('session-1');

      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('payments');
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });
});
